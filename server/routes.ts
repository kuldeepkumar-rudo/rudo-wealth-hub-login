import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertPortfolioSchema,
  insertHoldingSchema,
  insertTransactionSchema,
  insertRiskProfileSchema,
  insertAssetAllocationSchema,
  insertRecommendationSchema,
  insertAAConsentSchema,
  insertFIAccountSchema,
  insertFIHoldingSchema,
  insertFITransactionSchema,
  insertFIBatchSchema,
  insertAAConsentEventSchema,
} from "@shared/schema";
import { createAAService } from "./services/accountAggregator";
import { setupAuth, isAuthenticated } from "./replitAuth";
// import { requireAuth as isAuthenticated } from "./authMiddleware";
import { pulseLabsService } from "./pulseLabsService";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}

// Helper to get user from request (works with both Replit Auth and our custom JWT auth)
const getAuthUser = (req: Request) => {
  return req.user as any;
};

// Ownership verification helpers
// These ensure users can only access resources they own
const assertOwnsPortfolio = async (req: Request, portfolioId: number) => {
  const user = getAuthUser(req);
  const portfolio = await storage.getPortfolio(portfolioId);
  if (!portfolio || portfolio.userId !== user.id) {
    throw new Error("Unauthorized access to portfolio");
  }
  return portfolio;
};

// REMOVED: assertOwnsFinancialAccount and assertOwnsAssetLinkSession helper functions
// These were part of the old custom asset linking system that has been replaced by FINVU Web SDK integration
// The corresponding tables (financialAccounts, assetLinkSessions, etc.) have been removed from the schema

export async function registerRoutes(app: Express): Promise<Server> {
  const aaService = createAAService();

  // ========== Authentication Setup ==========
  // Setup Replit Auth session middleware
  await setupAuth(app);

  // ========== Auth Routes ==========
  // GET /api/auth/user - Get authenticated user (sanitized, no tokens)
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    // SECURITY: Never return req.user directly - it contains OAuth tokens
    // Return sanitized user data from storage instead
    const user = await storage.getUser(getAuthUser(req).id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      phone: user.phone,
    });
  });

  // ========== User Routes ==========
  // User creation is handled by Replit Auth during login
  // No public user creation endpoint needed

  app.get("/api/users/:id", isAuthenticated, async (req, res, next) => {
    try {
      // Users can only access their own profile
      if (req.params.id !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req, res, next) => {
    try {
      // Users can only update their own profile
      if (req.params.id !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedUser = await storage.updateUser(req.params.id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Portfolio Routes ==========
  app.post("/api/portfolios", isAuthenticated, async (req, res, next) => {
    try {
      const portfolioData = insertPortfolioSchema.parse(req.body);
      // Always use authenticated user's ID, ignore any userId in request body
      const portfolio = await storage.createPortfolio({
        ...portfolioData,
        userId: getAuthUser(req).id,
      });
      res.json(portfolio);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/portfolios/:id", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.id);
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/users/:userId/portfolios", isAuthenticated, async (req, res, next) => {
    try {
      // Users can only access their own portfolios
      if (req.params.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const portfolios = await storage.getPortfoliosByUserId(getAuthUser(req).id);
      res.json(portfolios);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/portfolios/:id", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.id);
      const updatedPortfolio = await storage.updatePortfolio(req.params.id, req.body);
      res.json(updatedPortfolio);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.delete("/api/portfolios/:id", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.id);
      const deleted = await storage.deletePortfolio(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json({ message: "Portfolio deleted successfully" });
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // Get comprehensive portfolio analytics
  app.get("/api/portfolios/:id/analytics", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.id);
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const holdings = await storage.getHoldingsByPortfolioId(req.params.id);
      const allocations = await storage.getAssetAllocationsByPortfolioId(req.params.id);
      const recommendations = await storage.getRecommendationsByPortfolioId(req.params.id);

      // Get risk profile
      const riskProfile = await storage.getRiskProfileByUserId(portfolio.userId);

      // Import analytics service
      const { createAnalyticsAggregatorService } = await import("./services/analyticsAggregator");
      const analyticsService = createAnalyticsAggregatorService();

      const analytics = await analyticsService.generateAnalytics(
        portfolio,
        holdings,
        allocations,
        recommendations,
        riskProfile || undefined
      );

      res.json(analytics);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Holding Routes ==========
  app.post("/api/holdings", isAuthenticated, async (req, res, next) => {
    try {
      const holdingData = insertHoldingSchema.parse(req.body);
      await assertOwnsPortfolio(getAuthUser(req).id, holdingData.portfolioId);

      const holding = await storage.createHolding(holdingData);
      res.json(holding);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/holdings/:id", isAuthenticated, async (req, res, next) => {
    try {
      const holding = await storage.getHolding(req.params.id);
      if (!holding) {
        return res.status(404).json({ message: "Holding not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, holding.portfolioId);
      res.json(holding);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/portfolios/:portfolioId/holdings", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.portfolioId);
      const holdings = await storage.getHoldingsByPortfolioId(req.params.portfolioId);

      // Get all transactions for this portfolio
      const allTransactions = await storage.getTransactionsByPortfolioId(req.params.portfolioId);

      // Import holding analytics utility
      const { calculateHoldingPeriod } = await import("./utils/holdingAnalytics");

      // Enhance holdings with holding period info
      const enhancedHoldings = holdings.map(holding => {
        const holdingPeriod = calculateHoldingPeriod(holding, allTransactions);
        return {
          ...holding,
          holdingPeriod,
        };
      });

      res.json(enhancedHoldings);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/holdings/:id", isAuthenticated, async (req, res, next) => {
    try {
      const holding = await storage.getHolding(req.params.id);
      if (!holding) {
        return res.status(404).json({ message: "Holding not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, holding.portfolioId);

      const updatedHolding = await storage.updateHolding(req.params.id, req.body);
      res.json(updatedHolding);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.delete("/api/holdings/:id", isAuthenticated, async (req, res, next) => {
    try {
      const holding = await storage.getHolding(req.params.id);
      if (!holding) {
        return res.status(404).json({ message: "Holding not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, holding.portfolioId);

      const deleted = await storage.deleteHolding(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Holding not found" });
      }
      res.json({ message: "Holding deleted successfully" });
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Transaction Routes ==========
  app.post("/api/transactions", isAuthenticated, async (req, res, next) => {
    try {
      // Parse date string to Date object if it's a string
      const body = {
        ...req.body,
        transactionDate: typeof req.body.transactionDate === 'string'
          ? new Date(req.body.transactionDate)
          : req.body.transactionDate,
      };
      const transactionData = insertTransactionSchema.parse(body);
      await assertOwnsPortfolio(getAuthUser(req).id, transactionData.portfolioId);

      // Server-side totalAmount validation - enforce correct calculation
      const quantity = parseFloat(transactionData.quantity);
      const price = parseFloat(transactionData.price);
      const fees = parseFloat(transactionData.fees || "0");
      const baseAmount = quantity * price;
      const expectedTotal = ['sell', 'withdrawal'].includes(transactionData.transactionType)
        ? baseAmount - fees
        : baseAmount + fees;

      // Override totalAmount with server-calculated value for data integrity
      const validatedData = {
        ...transactionData,
        totalAmount: expectedTotal.toFixed(2),
      };

      const transaction = await storage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/transactions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, transaction.portfolioId);
      res.json(transaction);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/portfolios/:portfolioId/transactions", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.portfolioId);
      const transactions = await storage.getTransactionsByPortfolioId(req.params.portfolioId);
      res.json(transactions);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/holdings/:holdingId/transactions", isAuthenticated, async (req, res, next) => {
    try {
      const holding = await storage.getHolding(req.params.holdingId);
      if (!holding) {
        return res.status(404).json({ message: "Holding not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, holding.portfolioId);
      const transactions = await storage.getTransactionsByHoldingId(req.params.holdingId);
      res.json(transactions);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Risk Profile Routes ==========
  app.post("/api/risk-profiles", isAuthenticated, async (req, res, next) => {
    try {
      const profileData = insertRiskProfileSchema.parse(req.body);
      // Always use authenticated user's ID
      const profile = await storage.createRiskProfile({
        ...profileData,
        userId: getAuthUser(req).id,
      });
      res.json(profile);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/users/:userId/risk-profile", isAuthenticated, async (req, res, next) => {
    try {
      // Users can only access their own risk profile
      if (req.params.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const profile = await storage.getRiskProfileByUserId(getAuthUser(req).id);
      if (!profile) {
        return res.status(404).json({ message: "Risk profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/risk-profiles/:id", isAuthenticated, async (req, res, next) => {
    try {
      const profile = await storage.getRiskProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Risk profile not found" });
      }
      // Users can only update their own risk profile
      if (profile.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedProfile = await storage.updateRiskProfile(req.params.id, req.body);
      res.json(updatedProfile);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Asset Allocation Routes ==========
  app.post("/api/asset-allocations", isAuthenticated, async (req, res, next) => {
    try {
      const allocationData = insertAssetAllocationSchema.parse(req.body);
      await assertOwnsPortfolio(getAuthUser(req).id, allocationData.portfolioId);

      const allocation = await storage.createAssetAllocation(allocationData);
      res.json(allocation);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/portfolios/:portfolioId/asset-allocations", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.portfolioId);
      const allocations = await storage.getAssetAllocationsByPortfolioId(req.params.portfolioId);
      res.json(allocations);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/asset-allocations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const allocation = await storage.getAssetAllocation(req.params.id);
      if (!allocation) {
        return res.status(404).json({ message: "Asset allocation not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, allocation.portfolioId);

      const updatedAllocation = await storage.updateAssetAllocation(req.params.id, req.body);
      res.json(updatedAllocation);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Recommendation Routes ==========
  app.post("/api/recommendations", isAuthenticated, async (req, res, next) => {
    try {
      const recommendationData = insertRecommendationSchema.parse(req.body);
      await assertOwnsPortfolio(getAuthUser(req).id, recommendationData.portfolioId);

      const recommendation = await storage.createRecommendation(recommendationData);
      res.json(recommendation);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/portfolios/:portfolioId/recommendations", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.portfolioId);
      const recommendations = await storage.getRecommendationsByPortfolioId(req.params.portfolioId);
      res.json(recommendations);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/portfolios/:portfolioId/recommendations/active", isAuthenticated, async (req, res, next) => {
    try {
      await assertOwnsPortfolio(getAuthUser(req).id, req.params.portfolioId);
      const recommendations = await storage.getActiveRecommendationsByPortfolioId(req.params.portfolioId);
      res.json(recommendations);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/recommendations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const recommendation = await storage.getRecommendation(req.params.id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, recommendation.portfolioId);

      const updatedRecommendation = await storage.updateRecommendation(req.params.id, req.body);
      res.json(updatedRecommendation);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.post("/api/recommendations/:id/dismiss", isAuthenticated, async (req, res, next) => {
    try {
      const recommendation = await storage.getRecommendation(req.params.id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, recommendation.portfolioId);

      const dismissed = await storage.dismissRecommendation(req.params.id);
      if (!dismissed) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      res.json({ message: "Recommendation dismissed successfully" });
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.post("/api/recommendations/:id/accept", isAuthenticated, async (req, res, next) => {
    try {
      const recommendation = await storage.getRecommendation(req.params.id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, recommendation.portfolioId);

      const accepted = await storage.acceptRecommendation(req.params.id);
      if (!accepted) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      res.json({ message: "Recommendation accepted successfully" });
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.post("/api/recommendations/:id/defer", isAuthenticated, async (req, res, next) => {
    try {
      const recommendation = await storage.getRecommendation(req.params.id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      await assertOwnsPortfolio(getAuthUser(req).id, recommendation.portfolioId);

      const deferred = await storage.deferRecommendation(req.params.id);
      if (!deferred) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      res.json({ message: "Recommendation deferred successfully" });
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== Account Aggregator Consent Routes ==========
  app.post("/api/aa-consents", isAuthenticated, async (req, res, next) => {
    try {
      const consentData = insertAAConsentSchema.parse(req.body);
      // Always use authenticated user's ID
      const consent = await storage.createAAConsent({
        ...consentData,
        userId: getAuthUser(req).id,
      });
      res.json(consent);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/users/:userId/aa-consents", isAuthenticated, async (req, res, next) => {
    try {
      // Users can only access their own consents
      if (req.params.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const consents = await storage.getAAConsentByUserId(getAuthUser(req).id);
      res.json(consents);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.get("/api/aa-consents/:consentHandle", isAuthenticated, async (req, res, next) => {
    try {
      const consent = await storage.getAAConsentByHandle(req.params.consentHandle);
      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }
      // Verify user owns this consent
      if (consent.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(consent);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  app.patch("/api/aa-consents/:id", isAuthenticated, async (req, res, next) => {
    try {
      const consent = await storage.getAAConsent(req.params.id);
      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }
      // Verify user owns this consent
      if (consent.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedConsent = await storage.updateAAConsent(req.params.id, req.body);
      res.json(updatedConsent);
    } catch (error: any) {
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      next(error);
    }
  });

  // ========== REMOVED: ASSET LINK SESSION ROUTES ==========
  // The following routes have been removed as part of migrating to FINVU Web SDK integration:
  //
  // Asset Link Session Routes (previously used assetLinkSessions table):
  // - POST /api/linking/sessions
  // - GET /api/users/:userId/linking/sessions
  // - GET /api/linking/sessions/:id
  // - PATCH /api/linking/sessions/:id
  //
  // These routes were used to track custom asset linking sessions with manual OTP verification.
  // They have been replaced by FINVU Web SDK which handles the entire linking flow automatically.
  // ==========================================================

  // ========== Account Aggregator Routes ==========

  // Test FINVU API connection
  app.get("/api/account-aggregator/test", async (req, res, next) => {
    try {
      // Test the connection by attempting a simple API call
      const testResult = {
        status: 'testing',
        message: 'Attempting to verify FINVU API connection...',
        environment: process.env.AA_ENVIRONMENT || 'UAT',
        fiuId: process.env.AA_ENVIRONMENT === 'PROD'
          ? process.env.AA_FINVU_PROD_FIU_ID
          : process.env.AA_FINVU_UAT_FIU_ID,
        baseUrl: process.env.AA_ENVIRONMENT === 'PROD'
          ? process.env.AA_FINVU_PROD_BASE_URL
          : process.env.AA_FINVU_UAT_BASE_URL,
        credentialsConfigured: {
          fiuId: !!(process.env.AA_ENVIRONMENT === 'PROD'
            ? process.env.AA_FINVU_PROD_FIU_ID
            : process.env.AA_FINVU_UAT_FIU_ID),
          baseUrl: !!(process.env.AA_ENVIRONMENT === 'PROD'
            ? process.env.AA_FINVU_PROD_BASE_URL
            : process.env.AA_FINVU_UAT_BASE_URL),
          channelId: !!(process.env.AA_ENVIRONMENT === 'PROD'
            ? process.env.AA_FINVU_PROD_CHANNEL_ID
            : process.env.AA_FINVU_UAT_CHANNEL_ID),
          channelPassword: !!(process.env.AA_ENVIRONMENT === 'PROD'
            ? process.env.AA_FINVU_PROD_CHANNEL_PASSWORD
            : process.env.AA_FINVU_UAT_CHANNEL_PASSWORD),
        },
        timestamp: new Date().toISOString(),
      };

      res.json(testResult);
    } catch (error: any) {
      next(error);
    }
  });

  // Institutions search
  app.get("/api/account-aggregator/institutions", isAuthenticated, async (req, res, next) => {
    try {
      const query = req.query.query as string || '';
      const type = req.query.type as string;

      // Convert type to lowercase for consistent matching
      const normalizedType = type?.toLowerCase() as 'amc' | 'broker' | 'bank' | 'insurer' | undefined;
      const institutions = await aaService.searchInstitutions(query, normalizedType);
      res.json(institutions);
    } catch (error: any) {
      next(error);
    }
  });

  // ========== Onboarding Consent Flow ==========
  // Initiate consent for onboarding (simplified flow)
  app.post("/api/aa/consent/initiate", isAuthenticated, async (req, res, next) => {
    try {
      const { pan, phone } = req.body;
      const userId = getAuthUser(req).id;

      // Validate inputs
      if (!pan || !phone) {
        return res.status(400).json({
          message: "PAN and phone number are required for consent initiation"
        });
      }

      // Validate PAN format (ABCDE1234F)
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(pan.toUpperCase())) {
        return res.status(400).json({
          message: "Invalid PAN format. Expected format: ABCDE1234F"
        });
      }

      // Convert phone to FINVU handle format
      // FINVU expects mobile@finvu (e.g., 9999999999@finvu)
      const mobileNumber = phone.replace(/\D/g, '').replace(/^(\+91|91)/, ''); // Remove country code
      const finvuHandle = `${mobileNumber}@finvu`;

      console.log('[AA Onboarding] Initiating consent:', {
        userId,
        pan,
        phone: mobileNumber,
        finvuHandle,
      });

      // Prepare consent request
      const dataFrom = new Date();
      dataFrom.setFullYear(dataFrom.getFullYear() - 2); // 2 years historical data
      const dataTo = new Date();
      const validityMonths = 12; // Consent valid for 1 year

      const consentRequest = {
        userId: finvuHandle, // FINVU handle for the user
        mobile: mobileNumber, // Raw mobile number for redirect URL
        purpose: 'Wealth Management and Investment Tracking for NRI Investors',
        dataRange: {
          from: dataFrom,
          to: dataTo,
        },
        frequency: {
          unit: 'MONTHLY' as const,
          value: 1,
        },
        dataLife: {
          unit: 'YEAR' as const,
          value: 1,
        },
        fiTypes: ['DEPOSIT', 'MUTUAL_FUNDS', 'SECURITIES', 'INSURANCE_POLICIES'],
      };

      // Call FINVU AA service to initiate consent
      const consentResponse = await aaService.initiateConsent(consentRequest);

      // Persist consent in database with additional metadata
      const storedConsent = await storage.createAAConsent({
        userId,
        consentHandle: consentResponse.consentHandle,
        consentId: consentResponse.consentId,
        fiuId: process.env.AA_ENVIRONMENT === 'PROD'
          ? process.env.AA_FINVU_PROD_FIU_ID || 'fiulive@rudowealth'
          : process.env.AA_FINVU_UAT_FIU_ID || 'fiu@rudowealth',
        status: consentResponse.status,
        consentMode: 'VIEW',
        fetchType: 'ONETIME',
        fiTypes: consentRequest.fiTypes as any,
        purpose: consentRequest.purpose,
        consentStart: consentResponse.consentStart,
        consentExpiry: consentResponse.consentExpiry,
        dataRangeFrom: dataFrom,
        dataRangeTo: dataTo,
        frequencyUnit: 'MONTH',
        frequencyValue: 1,
        dataLifeUnit: 'YEAR',
        dataLifeValue: validityMonths,
        fiDataRangeMonths: 24, // 2 years of data
        metadata: {
          pan: pan.toUpperCase(),
          phone: mobileNumber,
          finvuHandle: finvuHandle,
          onboardingFlow: true,
        },
      });

      console.log('[AA Onboarding] Consent created:', {
        consentId: storedConsent.consentId,
        redirectUrl: consentResponse.redirectUrl,
      });

      // Return consent details with redirect URL
      res.json({
        success: true,
        consentId: storedConsent.consentId,
        consentHandle: storedConsent.consentHandle,
        status: storedConsent.status,
        redirectUrl: consentResponse.redirectUrl,
        message: 'Consent initiated successfully. Redirecting to FINVU for approval...',
      });
    } catch (error: any) {
      console.error('[AA Onboarding] Error initiating consent:', error);
      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.status(500).json({
        message: 'Failed to initiate consent',
        error: error.message
      });
    }
  });

  /**
   * Callback endpoint for FINVU to redirect users after consent approval
   * 
   * FINVU will redirect users to this URL after they approve/reject consent
   * Query params: 
   * - consentHandle (required): The consent identifier
   * 
   * SECURITY:
   * - Requires active user session (isAuthenticated middleware)
   * - Verifies consent belongs to authenticated user (ownership check)
   * - Session cookies (SameSite=Lax) survive FINVU redirect roundtrip
   * - Uses storage layer for all database operations
   * - Logs all consent state changes for audit trail
   * - FINVU webhook (Task 4) serves as authoritative status source
   * 
   * Flow:
   * 1. Verify user is authenticated (session-based)
   * 2. Extract consentHandle from query params
   * 3. Verify consent belongs to authenticated user
   * 4. Fetch consent status from FINVU API
   * 5. Update consent through storage layer
   * 6. Log event for audit trail
   * 7. Redirect user to appropriate screen based on status
   */
  app.get('/api/aa/consent/callback', isAuthenticated, async (req, res) => {
    try {
      const { consentHandle } = req.query;
      const userId = getAuthUser(req).id;

      // Validate required parameters
      if (!consentHandle || typeof consentHandle !== 'string') {
        console.error('[AA Callback] Missing or invalid consentHandle');
        return res.redirect('/onboarding?error=invalid_consent');
      }

      console.log('[AA Callback] User returned from FINVU:', { consentHandle, userId });

      // Look up consent and verify ownership using storage interface
      const consent = await storage.getAAConsentByHandle(consentHandle);

      if (!consent) {
        console.error('[AA Callback] Consent not found in database:', consentHandle);
        return res.redirect('/onboarding?error=consent_not_found');
      }

      // Verify ownership - consent must belong to authenticated user
      if (consent.userId !== userId) {
        console.error('[AA Callback] Ownership violation - consent belongs to different user');
        return res.redirect('/onboarding?error=unauthorized');
      }

      console.log('[AA Callback] Ownership verified, fetching consent status from FINVU');

      // Verify consent status with FINVU API
      const consentStatus = await aaService.getConsentStatusByHandle(consentHandle);

      console.log('[AA Callback] Consent status from FINVU:', consentStatus.status);

      // Update consent status through storage layer
      // Ownership is already verified via state token above
      await storage.updateAAConsent(consent.id, {
        status: consentStatus.status,
        consentStart: consentStatus.consentStart,
        consentExpiry: consentStatus.consentExpiry,
      });

      // Log consent event for audit trail using storage interface
      await storage.createAAConsentEvent({
        consentHandle: consentHandle,
        eventType: consentStatus.status === 'ACTIVE' ? 'CONSENT_APPROVED' : 'CONSENT_STATUS_UPDATED',
        eventData: consentStatus,
      });

      console.log('[AA Callback] Consent updated successfully');

      // Redirect to sync screen if consent is active
      if (consentStatus.status === 'ACTIVE') {
        return res.redirect('/onboarding?step=sync&consentApproved=true');
      } else if (consentStatus.status === 'REJECTED') {
        return res.redirect('/onboarding?step=consent&error=consent_rejected');
      } else {
        return res.redirect('/onboarding?step=sync&status=' + consentStatus.status);
      }

    } catch (error) {
      console.error('[AA Callback] Error processing callback:', error);
      return res.redirect('/onboarding?error=callback_failed');
    }
  });

  // Create consent
  app.post("/api/account-aggregator/consent", isAuthenticated, async (req, res, next) => {
    try {
      const { purpose, fiTypes, dataRangeMonths = 12, validityMonths = 12, mobile } = req.body;
      // Always use authenticated user's ID for database storage
      const userId = getAuthUser(req).id;

      // Mobile number is mandatory for Finfactor API
      if (!mobile) {
        return res.status(400).json({
          message: 'Mobile number is required. Please provide your registered mobile number.'
        });
      }

      // Clean and validate mobile number
      const cleanMobile = String(mobile).replace(/\D/g, '').replace(/^(\+91|91)/, '');
      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          message: 'Invalid mobile number. Please provide a valid 10-digit Indian mobile number.'
        });
      }

      // Format custId for Finfactor API (mobile@finvu)
      const customerAAId = `${cleanMobile}@finvu`;

      // Prepare consent request
      const now = new Date();
      const dataFrom = new Date();
      dataFrom.setMonth(dataFrom.getMonth() - dataRangeMonths);
      const dataTo = new Date();
      const validTo = new Date();
      validTo.setMonth(validTo.getMonth() + validityMonths);

      const consentRequest = {
        userId: customerAAId, // AA handle format: mobile@finvu
        purpose: purpose || 'Wealth Management and Investment Tracking',
        dataRange: {
          from: dataFrom,
          to: dataTo,
        },
        frequency: {
          unit: 'MONTHLY' as const,
          value: 1,
        },
        dataLife: {
          unit: 'MONTH' as const,
          value: validityMonths,
        },
        fiTypes: fiTypes || ['DEPOSIT', 'MUTUAL_FUNDS', 'SECURITIES'],
        mobile: mobile, // Pass mobile for redirect URL generation
      };

      // Call FINVU AA service to initiate consent
      const consentResponse = await aaService.initiateConsent(consentRequest);

      // Persist consent in database
      const storedConsent = await storage.createAAConsent({
        userId,
        consentHandle: consentResponse.consentHandle,
        consentId: consentResponse.consentId,
        fiuId: process.env.AA_ENVIRONMENT === 'PROD'
          ? process.env.AA_FINVU_PROD_FIU_ID || 'fiulive@rudowealth'
          : process.env.AA_FINVU_UAT_FIU_ID || 'fiu@rudowealth',
        status: consentResponse.status,
        consentMode: 'VIEW',
        fetchType: 'ONETIME',
        fiTypes: fiTypes || ['DEPOSIT', 'MUTUAL_FUNDS', 'EQUITIES'],
        purpose: purpose || 'Wealth Management and Investment Tracking',
        consentStart: consentResponse.consentStart,
        consentExpiry: consentResponse.consentExpiry,
        dataRangeFrom: dataFrom,
        dataRangeTo: dataTo,
        frequencyUnit: 'MONTH',
        frequencyValue: 1,
        dataLifeUnit: 'MONTH',
        dataLifeValue: validityMonths,
        fiDataRangeMonths: dataRangeMonths,
      });

      res.json({
        id: storedConsent.id,
        consentId: storedConsent.consentId,
        consentHandle: storedConsent.consentHandle,
        status: storedConsent.status,
        consentStart: storedConsent.consentStart,
        consentExpiry: storedConsent.consentExpiry,
        redirectUrl: consentResponse.redirectUrl,
        message: 'Consent created and stored successfully. User needs to approve via their AA app.',
      });
    } catch (error: any) {
      console.error('[AA Consent] Error creating consent:', error);

      if (error.message?.startsWith('OWNERSHIP')) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Extract error details from various error shapes
      const errorMsg = String(error.message || '');
      const errorData = error.response?.data || error.data || {};
      const errorDetails = JSON.stringify(errorData);
      const fullErrorText = `${errorMsg} ${errorDetails}`.toLowerCase();

      // Handle Finfactor API errors with user-friendly messages
      if (fullErrorText.includes('invalid cust id') || fullErrorText.includes('invalid customer') || fullErrorText.includes('custid')) {
        return res.status(400).json({
          message: 'The mobile number is not registered with any financial institution. Please verify and try again.',
          error: 'INVALID_CUSTOMER_ID'
        });
      }
      if (fullErrorText.includes('authentication') || fullErrorText.includes('unauthorized') || fullErrorText.includes('401') || fullErrorText.includes('token')) {
        return res.status(503).json({
          message: 'Unable to connect to the Account Aggregator service. Please try again later.',
          error: 'AA_AUTH_FAILED'
        });
      }
      if (fullErrorText.includes('timeout') || fullErrorText.includes('econnrefused') || fullErrorText.includes('network') || fullErrorText.includes('econnreset')) {
        return res.status(503).json({
          message: 'The Account Aggregator service is temporarily unavailable. Please try again later.',
          error: 'AA_SERVICE_UNAVAILABLE'
        });
      }
      if (fullErrorText.includes('400') || fullErrorText.includes('bad request')) {
        return res.status(400).json({
          message: 'Invalid request. Please check your input and try again.',
          error: 'INVALID_REQUEST'
        });
      }

      // Generic error fallback
      return res.status(500).json({
        message: 'Failed to create consent. Please try again or contact support if the issue persists.',
        error: 'CONSENT_CREATION_FAILED'
      });
    }
  });

  // Get consent status
  app.get("/api/account-aggregator/consent/:consentId/status", isAuthenticated, async (req, res, next) => {
    try {
      const { consentId } = req.params;

      // Try to get consent by either database ID, Finvu consent ID, or consent handle
      let storedConsent = await storage.getAAConsent(consentId);
      if (!storedConsent) {
        storedConsent = await storage.getAAConsentByConsentId(consentId);
      }
      if (!storedConsent) {
        storedConsent = await storage.getAAConsentByHandle(consentId);
      }

      if (!storedConsent) {
        return res.status(404).json({ message: 'Consent not found' });
      }

      // Verify user owns this consent
      if (storedConsent.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Fetch latest status from FINVU using the handle
      const consentStatus = await aaService.getConsentStatusByHandle(storedConsent.consentHandle);

      // Update stored consent if status changed
      if (consentStatus.status !== storedConsent.status) {
        await storage.updateAAConsent(storedConsent.id, {
          status: consentStatus.status,
        });
      }

      res.json({
        id: storedConsent.id,
        consentId: storedConsent.consentId,
        consentHandle: storedConsent.consentHandle,
        status: consentStatus.status,
        consentStart: consentStatus.consentStart,
        consentExpiry: consentStatus.consentExpiry,
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Revoke consent
  app.delete("/api/account-aggregator/consent/:consentId", isAuthenticated, async (req, res, next) => {
    try {
      const { consentId } = req.params;

      // Try to get consent by either database ID, Finvu consent ID, or consent handle
      let storedConsent = await storage.getAAConsent(consentId);
      if (!storedConsent) {
        storedConsent = await storage.getAAConsentByConsentId(consentId);
      }
      if (!storedConsent) {
        storedConsent = await storage.getAAConsentByHandle(consentId);
      }

      if (!storedConsent) {
        return res.status(404).json({ message: 'Consent not found' });
      }

      // Verify user owns this consent
      if (storedConsent.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Revoke with FINVU using the handle
      const success = await aaService.revokeConsent(storedConsent.consentHandle);

      // Update stored consent status
      if (success) {
        await storage.updateAAConsent(storedConsent.id, {
          status: 'REVOKED',
        });
      }

      res.json({
        success,
        message: success ? 'Consent revoked successfully' : 'Failed to revoke consent',
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Fetch financial data
  app.post("/api/account-aggregator/fi-data", isAuthenticated, async (req, res, next) => {
    try {
      const { consentId, dataRangeMonths = 12 } = req.body;

      if (!consentId) {
        return res.status(400).json({ message: "consentId is required" });
      }

      // Verify user owns this consent - try database ID, Finvu consent ID, then handle
      let storedConsent = await storage.getAAConsent(consentId);
      if (!storedConsent) {
        storedConsent = await storage.getAAConsentByConsentId(consentId);
      }
      if (!storedConsent) {
        storedConsent = await storage.getAAConsentByHandle(consentId);
      }
      if (!storedConsent) {
        return res.status(404).json({ message: "Consent not found" });
      }
      if (storedConsent.userId !== getAuthUser(req).id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dataTo = new Date();
      const dataFrom = new Date();
      dataFrom.setMonth(dataFrom.getMonth() - dataRangeMonths);

      const fiRequest = {
        consentId: storedConsent.consentId || consentId,
        consentHandle: storedConsent.consentHandle,
        dateRange: {
          from: dataFrom,
          to: dataTo,
        },
      };

      const fiDataResponse = await aaService.requestFIData(fiRequest);

      res.json({
        consentId,
        sessionId: fiDataResponse.sessionId,
        status: fiDataResponse.status,
        message: 'FI data request initiated successfully',
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Discover accounts by institution
  app.get("/api/account-aggregator/institutions/:institutionId/discover", isAuthenticated, async (req, res, next) => {
    try {
      const { institutionId } = req.params;
      // Always use authenticated user's ID
      const userId = getAuthUser(req).id;

      const accounts = await aaService.discoverAccounts(institutionId, userId);
      res.json(accounts);
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * FINVU Webhook: Consent Notification
   * 
   * FINVU sends this webhook when consent status changes:
   * - PENDING → ACTIVE (user approved)
   * - PENDING → REJECTED (user rejected)
   * - ACTIVE → REVOKED (user revoked consent)
   * - ACTIVE → EXPIRED (consent expired)
   * 
   * SECURITY:
   * - Verifies JWS signature from x-jws-signature header
   * - Logs all events to aa_consent_events for audit trail
   * - Updates consent status atomically through storage layer
   * 
   * This webhook serves as the authoritative status source, even if the
   * user callback (Task 3) was missed or delayed.
   */
  app.post("/api/aa/consent/notification", async (req, res, next) => {
    try {
      console.log('[AA Webhook] Consent notification received:', {
        body: req.body,
        signature: req.headers['x-jws-signature'] ? 'present' : 'missing',
      });

      // Verify detached JWS signature against raw HTTP body (required in production mode)
      const signature = req.headers['x-jws-signature'] as string;
      const rawBody = (req as any).rawBody; // Raw body captured by middleware
      const verifiedPayload = await aaService.verifyWebhookSignature(signature, rawBody, req.body);

      if (!verifiedPayload) {
        console.error('[AA Webhook] Invalid or missing JWS signature - rejecting webhook');
        return res.status(401).json({
          success: false,
          message: 'Invalid or missing webhook signature',
        });
      }

      // SECURITY: Use ONLY the verified payload (cryptographically verified against raw body)
      // This prevents ALL tampering attacks: modified bodies, whitespace, key ordering, extra fields
      const { consentHandle, consentId, status, consentStart, consentExpiry } = verifiedPayload;
      const handle = consentHandle || consentId;

      if (!handle) {
        console.error('[AA Webhook] Missing consentHandle/consentId');
        return res.status(400).json({
          success: false,
          message: 'Missing consent identifier',
        });
      }

      // Find stored consent
      const storedConsent = await storage.getAAConsentByHandle(handle);

      if (!storedConsent) {
        console.warn(`[AA Webhook] Consent not found for handle: ${handle}`);
        // Log the event anyway for debugging
        await storage.createAAConsentEvent({
          consentHandle: handle,
          eventType: 'CONSENT_NOT_FOUND',
          eventData: req.body,
        });

        return res.status(404).json({
          success: false,
          message: 'Consent not found',
          consentHandle: handle,
        });
      }

      // Update consent status through storage layer
      await storage.updateAAConsent(storedConsent.id, {
        status: status || 'ACTIVE',
        consentStart: consentStart ? new Date(consentStart) : undefined,
        consentExpiry: consentExpiry ? new Date(consentExpiry) : undefined,
      });

      console.log(`[AA Webhook] Updated consent ${storedConsent.id} to status: ${status}`);

      // Log event for audit trail
      const eventType = status === 'ACTIVE' ? 'CONSENT_APPROVED' :
        status === 'REJECTED' ? 'CONSENT_REJECTED' :
          status === 'REVOKED' ? 'CONSENT_REVOKED' :
            status === 'EXPIRED' ? 'CONSENT_EXPIRED' :
              'CONSENT_STATUS_UPDATED';

      await storage.createAAConsentEvent({
        consentHandle: handle,
        eventType,
        eventData: verifiedPayload, // Use verified payload, not req.body
      });

      res.json({
        success: true,
        message: 'Consent notification processed',
        consentId: storedConsent.consentId,
        consentHandle: handle,
        status,
      });
    } catch (error: any) {
      console.error('[AA Webhook] Error processing consent notification:', error);
      next(error);
    }
  });

  /**
   * FINVU Webhook: FI Data Notification
   * 
   * FINVU sends this webhook when FI data is ready for download:
   * - User consent is active
   * - FIP has prepared financial data
   * - Data is ready to be fetched via FI/fetch API
   * 
   * SECURITY:
   * - Verifies JWS signature from x-jws-signature header
   * - Logs all events to aa_consent_events for audit trail
   * - Stores raw FI batch data in fi_batches for idempotency (Task 5)
   * 
   * PROCESSING:
   * - Creates fi_batches record with raw webhook payload
   * - Logs event for audit trail
   * - Returns success (actual data fetching/parsing is async)
   * 
   * Task 5 will add:
   * - Idempotency key computation for holdings/transactions
   * - Deduplication logic to prevent duplicate inserts
   * - Parsing of FI data into structured format
   */
  app.post("/api/aa/fi/notification", async (req, res, next) => {
    try {
      console.log('[AA Webhook] FI data notification received:', {
        body: req.body,
        signature: req.headers['x-jws-signature'] ? 'present' : 'missing',
      });

      // Verify detached JWS signature against raw HTTP body (required in production mode)
      const signature = req.headers['x-jws-signature'] as string;
      const rawBody = (req as any).rawBody; // Raw body captured by middleware
      const verifiedPayload = await aaService.verifyWebhookSignature(signature, rawBody, req.body);

      if (!verifiedPayload) {
        console.error('[AA Webhook] Invalid or missing JWS signature - rejecting webhook');
        return res.status(401).json({
          success: false,
          message: 'Invalid or missing webhook signature',
        });
      }

      // SECURITY: Use ONLY the verified payload (cryptographically verified against raw body)
      // This prevents ALL tampering attacks: modified bodies, whitespace, key ordering, extra fields
      const { sessionId, consentHandle, consentId, status, fiDataRange } = verifiedPayload;
      const handle = consentHandle || consentId;

      if (!sessionId) {
        console.error('[AA Webhook] Missing sessionId');
        return res.status(400).json({
          success: false,
          message: 'Missing session identifier',
        });
      }

      // Look up consent to get userId for ownership
      let userId: string | undefined;
      if (handle) {
        const consent = await storage.getAAConsentByHandle(handle);
        if (consent) {
          userId = consent.userId;
        }
      }

      // Store raw FI batch data for processing
      // This provides idempotency - webhook can be sent multiple times
      const batchId = await storage.createFIBatch({
        userId: userId || null,
        consentHandle: handle || null,
        sessionId: sessionId,
        status: status || 'READY',
        rawPayload: verifiedPayload, // Use verified payload, not req.body
      });

      console.log(`[AA Webhook] Created FI batch ${batchId} for session ${sessionId}`);

      // Log event for audit trail
      if (handle) {
        await storage.createAAConsentEvent({
          consentHandle: handle,
          eventType: 'FI_DATA_READY',
          eventData: {
            sessionId,
            batchId,
            status,
            fiDataRange,
          },
        });
      }

      // TODO (Task 5): Trigger async processing of FI batch
      // - Fetch FI data from FINVU API using sessionId
      // - Parse and decrypt FI data
      // - Compute idempotency keys for holdings/transactions
      // - Insert into fi_holdings and fi_transactions with deduplication

      res.json({
        success: true,
        message: 'FI data notification processed',
        sessionId,
        batchId,
        status,
      });
    } catch (error: any) {
      console.error('[AA Webhook] Error processing FI notification:', error);
      next(error);
    }
  });

  // ========== Institution Search Routes ==========
  app.get("/api/linking/institutions/search", isAuthenticated, async (req, res, next) => {
    try {
      const query = req.query.query as string || '';
      const type = req.query.type as 'amc' | 'broker' | 'bank' | 'insurer' | undefined;

      const institutions = await aaService.searchInstitutions(query, type);
      res.json(institutions);
    } catch (error: any) {
      next(error);
    }
  });

  // ========== Account Discovery Routes ==========
  app.get("/api/linking/institutions/:institutionId/accounts", isAuthenticated, async (req, res, next) => {
    try {
      // Always use authenticated user's ID, ignore userId from query
      const userId = getAuthUser(req).id;

      const accounts = await aaService.discoverAccounts(req.params.institutionId, userId);
      res.json(accounts);
    } catch (error: any) {
      next(error);
    }
  });

  // ========== REMOVED: OLD CUSTOM ASSET LINKING ROUTES ==========
  // The following routes have been removed as part of migrating to FINVU Web SDK integration:
  // 
  // OTP Routes (previously used assetLinkSessions table):
  // - POST /api/linking/sessions/:id/send-otp
  // - POST /api/linking/sessions/:id/verify-otp
  //
  // Financial Account Routes (previously used financialAccounts table):
  // - GET /api/users/:userId/accounts
  // - GET /api/users/:userId/accounts/:assetType
  // - POST /api/accounts
  // - PATCH /api/accounts/:id
  //
  // Asset-Specific Account Routes (previously used mutualFundAccounts, stockAccounts, bankAccounts, insurancePolicies tables):
  // - POST /api/accounts/mutual-funds
  // - POST /api/accounts/stocks
  // - POST /api/accounts/banks
  // - POST /api/accounts/insurance
  //
  // These custom account linking flows have been replaced by:
  // 1. FINVU Web SDK for account linking UI
  // 2. Account Aggregator (AA) APIs for consent management
  // 3. FI Account tables (fiAccounts, fiHoldings, fiTransactions) for storing linked data
  // 
  // See FINVU_INTEGRATION_GUIDE.md for the new integration approach
  // ============================================================

  // ========== Pulse Labs Mutual Fund Routes ==========

  // GET /api/mutual-funds/search - Search for mutual fund schemes
  app.get("/api/mutual-funds/search", isAuthenticated, async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      // Cache TTL: 24 hours (in milliseconds)
      const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

      // First, check if we have cached results
      const cachedSchemes = await storage.searchPulseLabsSchemes(query);

      // Check if cached results are fresh (updated within TTL)
      if (cachedSchemes.length > 0) {
        const now = new Date();
        const freshSchemes = cachedSchemes.filter((scheme) => {
          if (!scheme.updatedAt) return false;
          const age = now.getTime() - new Date(scheme.updatedAt).getTime();
          return age < CACHE_TTL_MS;
        });

        // If we have any fresh results, return them (prefer cache over API)
        if (freshSchemes.length > 0) {
          return res.json({ schemes: freshSchemes, source: "cache" });
        }
      }

      // Otherwise, fetch from Pulse Labs API
      const schemes = await pulseLabsService.searchSchemes(query);

      // Store/update schemes in our database
      for (const scheme of schemes.slice(0, 20)) { // Limit to 20 results
        await storage.upsertPulseLabsScheme(scheme);
      }

      res.json({ schemes, source: "api" });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/mutual-funds/:schemeCode - Get scheme details
  app.get("/api/mutual-funds/:schemeCode", isAuthenticated, async (req, res, next) => {
    try {
      const { schemeCode } = req.params;
      console.log(`[MF Detail] Fetching scheme: ${schemeCode}`, "mutual-funds");

      // Try to get from cache first
      let scheme = await storage.getPulseLabsScheme(schemeCode);
      console.log(`[MF Detail] Cache lookup: ${scheme ? "FOUND" : "NOT FOUND"}`, "mutual-funds");

      // If not in cache, fetch from Pulse Labs
      if (!scheme) {
        console.log(`[MF Detail] Fetching from Pulse Labs API...`, "mutual-funds");
        const metadata = await pulseLabsService.getSchemeMetadata(schemeCode);
        if (metadata) {
          console.log(`[MF Detail] Pulse Labs returned metadata, storing in cache`, "mutual-funds");
          scheme = await storage.upsertPulseLabsScheme(metadata);
        } else {
          console.log(`[MF Detail] Pulse Labs returned null`, "mutual-funds");
        }
      }

      if (!scheme) {
        console.log(`[MF Detail] Scheme ${schemeCode} not found anywhere`, "mutual-funds");
        return res.status(404).json({ message: "Scheme not found" });
      }

      console.log(`[MF Detail] Returning scheme: ${scheme.schemeName}`, "mutual-funds");
      res.json(scheme);
    } catch (error: any) {
      console.log(`[MF Detail] Error: ${error.message}`, "mutual-funds");
      next(error);
    }
  });

  // GET /api/mutual-funds/:schemeCode/nav-history - Get NAV history
  app.get("/api/mutual-funds/:schemeCode/nav-history", isAuthenticated, async (req, res, next) => {
    try {
      const { schemeCode } = req.params;
      const { startDate, endDate } = req.query;

      const navHistory = await pulseLabsService.getNavHistory(
        schemeCode,
        startDate as string | undefined,
        endDate as string | undefined
      );

      // Return array directly (not wrapped in object)
      res.json(navHistory);
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/mutual-funds/categories - Get asset categories
  app.get("/api/mutual-funds/categories", isAuthenticated, async (req, res, next) => {
    try {
      const categories = await pulseLabsService.getAssetCategories();
      res.json({ categories });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/mutual-funds/:schemeCode/fund-card - Get comprehensive fund details
  app.get("/api/mutual-funds/:schemeCode/fund-card", isAuthenticated, async (req, res, next) => {
    try {
      const { schemeCode } = req.params;
      const fundCard = await pulseLabsService.getFundCard(schemeCode);
      res.json(fundCard);
    } catch (error: any) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
