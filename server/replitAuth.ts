// Replit Auth integration using OpenID Connect
// Reference: blueprint:javascript_log_in_with_replit

import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  // Detect if running in published deployment (REPLIT_DEPLOYMENT=1) or development
  const isPublished = process.env.REPLIT_DEPLOYMENT === "1";
  const hasDatabase = !!process.env.DATABASE_URL;

  // Use PostgreSQL for session storage if:
  // 1. App is published (REPLIT_DEPLOYMENT=1), OR
  // 2. Database is available (DATABASE_URL is set)
  // Otherwise use MemoryStore for local development
  const usePostgres = isPublished || hasDatabase;

  const store = usePostgres
    ? new (connectPg(session))({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true, // Auto-create sessions table
      ttl: sessionTtl,
      tableName: "sessions",
    })
    : undefined; // express-session uses MemoryStore by default

  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // SECURITY: Replit always provides HTTPS, so cookies should always be secure
      // But allow flexibility in local development
      secure: process.env.NODE_ENV !== "development",
      // Use "lax" for better OAuth redirect compatibility
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  return await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // SECURITY: Only serialize user ID to session (not tokens)
  passport.serializeUser((user: Express.User, cb) => {
    cb(null, (user as any).id);
  });

  // SECURITY: Deserialize validates user exists in storage
  // This prevents session tampering and ensures user data is fresh
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // User not found - gracefully invalidate session
        // This happens in development when server restarts and loses MemStorage data
        console.log(`[Auth] User ${id} not found in storage - invalidating session`);
        return cb(null, false);
      }
      cb(null, { id: user.id });
    } catch (error) {
      console.error("[Auth] Error deserializing user:", error);
      cb(null, false);
    }
  });

  // Check if we are in Replit environment
  if (!process.env.REPL_ID) {
    console.log("[Auth] REPL_ID not found - Enabling Mock Auth mode for local development");

    app.get("/api/login", async (req, res, next) => {
      try {
        // Create a demo user for local development
        const demoUser = await storage.upsertUser({
          id: "demo-user",
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User",
          profileImageUrl: "https://ui-avatars.com/api/?name=Demo+User&background=random",
        });

        req.login(demoUser, (err) => {
          if (err) {
            return next(err);
          }
          return res.redirect("/");
        });
      } catch (error) {
        next(error);
      }
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });

    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    // Extract user claims from OAuth token
    const claims = tokens.claims();

    // Upsert user in database
    const dbUser = await upsertUser(claims);

    // SECURITY: Only store user ID in session, never store tokens
    // Tokens are server-side only and never exposed to client
    verified(null, { id: dbUser.id });
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          // IMPORTANT: Always use HTTPS for callback (Replit Auth requirement)
          // Replit provides HTTPS URLs even in development
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          // IMPORTANT: Always use HTTPS (Replit provides HTTPS even in dev)
          post_logout_redirect_uri: `https://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated and has a valid session
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // SECURITY: req.user only contains {id}, fetched from session
  // No tokens are ever stored in session or exposed to client
  return next();
};
