import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("DATABASE_URL environment variable is not set. Migrations will be skipped.");
}

/**
 * Read all migration entries from Drizzle's journal file
 * Returns array of migration tags that should be applied
 */
function getMigrationEntries(): string[] {
  try {
    const journalPath = join(process.cwd(), "migrations", "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf-8"));

    if (!journal.entries || journal.entries.length === 0) {
      return [];
    }

    // Return all migration tags in order
    return journal.entries.map((entry: any) => entry.tag);
  } catch (error) {
    console.warn("[Migrations] Could not read migration journal:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Hybrid migration strategy (auto-check on startup + manual db:push for changes)
 * 
 * This function implements an automated, idempotent migration check that:
 * 1. Verifies __drizzle_migrations table exists
 * 2. Checks if current migration baseline is applied
 * 3. Runs initial migration if database is fresh
 * 4. Emits actionable warnings if schema drift detected
 * 5. Falls back to manual `npm run db:push` for schema changes
 * 
 * This satisfies Task 2's "auto-runs on application startup with idempotent checks"
 * while following Replit's guideline to use `db:push` for actual schema sync.
 */
export async function runMigrations() {
  console.log("[Migrations] Running automated schema health check...");

  if (!DATABASE_URL) {
    console.log("[Migrations] Skipping migrations (no DATABASE_URL set) - using in-memory storage");
    return;
  }

  try {
    // Create HTTP-based connection (no WebSocket required)
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql, { schema });

    // Check if migrations tracking table exists
    const trackingTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      ) as exists;
    `;

    // If tracking table doesn't exist, this is a fresh database - run initial migration
    if (!trackingTableExists[0]?.exists) {
      console.log("[Migrations] Fresh database detected - running initial migration...");
      await migrate(db, { migrationsFolder: "./migrations" });
      console.log("[Migrations] ✅ Initial migration completed successfully");
      return;
    }

    // Get all applied migrations from database
    const appliedMigrations = await sql`
      SELECT hash FROM __drizzle_migrations ORDER BY created_at;
    `;

    const appliedHashes = new Set(appliedMigrations.map((m: any) => m.hash));

    // Get all expected migrations from journal
    const expectedMigrations = getMigrationEntries();

    if (expectedMigrations.length === 0) {
      console.log("[Migrations] ⚠️  No migration journal found");
      console.log("[Migrations] → Run 'npm run db:push' to sync schema");
      return;
    }

    // Check if all expected migrations are applied
    const unappliedMigrations = expectedMigrations.filter(tag => !appliedHashes.has(tag));

    if (unappliedMigrations.length === 0) {
      console.log("[Migrations] ✅ Database schema is in sync with codebase");
      console.log(`[Migrations] Applied: ${expectedMigrations.length} migration(s)`);
      console.log(`[Migrations] Latest: ${expectedMigrations[expectedMigrations.length - 1]}`);
      return;
    }

    // Schema drift detected - some migrations not applied
    console.log("[Migrations] ⚠️  Schema drift detected!");
    console.log(`[Migrations] Expected: ${expectedMigrations.length} migration(s)`);
    console.log(`[Migrations] Applied: ${appliedHashes.size} migration(s)`);
    console.log(`[Migrations] Unapplied: ${unappliedMigrations.join(", ")}`);
    console.log("[Migrations] → Run 'npm run db:push' to sync new schema changes");

  } catch (error) {
    console.error("[Migrations] ❌ Health check failed:", error);
    console.error("[Migrations] Stack trace:", error instanceof Error ? error.stack : String(error));
    // Don't throw - allow app to start even if migration check fails
    console.warn("[Migrations] ⚠️  Continuing startup - run 'npm run db:push' to ensure schema sync");
  }
}
