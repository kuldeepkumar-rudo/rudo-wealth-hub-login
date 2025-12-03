import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  decimal, 
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const assetTypeEnum = pgEnum("asset_type", [
  "mutual_fund",
  "stock",
  "fixed_deposit",
  "recurring_deposit",
  "insurance",
  "bond",
  "real_estate",
  "gold",
  "other"
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "buy",
  "sell",
  "dividend",
  "interest",
  "deposit",
  "withdrawal"
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "very_low",
  "low",
  "moderate",
  "high",
  "very_high"
]);

export const recommendationActionEnum = pgEnum("recommendation_action", [
  "buy",
  "sell",
  "hold",
  "increase",
  "decrease"
]);

export const linkingStatusEnum = pgEnum("linking_status", [
  "pending",
  "in_progress",
  "awaiting_otp",
  "completed",
  "failed",
  "cancelled"
]);

export const institutionTypeEnum = pgEnum("institution_type", [
  "amc",      // Asset Management Company (Mutual Funds)
  "broker",   // Stock Broker
  "bank",     // Bank
  "insurer",  // Insurance Company
  "other"
]);

export const sipFrequencyEnum = pgEnum("sip_frequency", [
  "weekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly"
]);

export const insuranceTypeEnum = pgEnum("insurance_type", [
  "life",
  "health",
  "term",
  "endowment",
  "ulip",
  "vehicle",
  "property",
  "other"
]);

export const depositTypeEnum = pgEnum("deposit_type", [
  "fixed_deposit",
  "recurring_deposit",
  "savings_account",
  "current_account"
]);

// Account Aggregator Enums
export const consentStatusEnum = pgEnum("consent_status", [
  "PENDING",
  "ACTIVE",
  "PAUSED",
  "REVOKED",
  "EXPIRED",
  "REJECTED"
]);

export const fiTypeEnum = pgEnum("fi_type", [
  "DEPOSIT",          // Bank accounts, FDs, RDs
  "MUTUAL_FUNDS",     // Mutual fund holdings
  "EQUITIES",         // Stock holdings
  "INSURANCE_POLICIES", // Insurance policies
  "BONDS",            // Bonds
  "DEBENTURES",       // Debentures
  "ETF",              // Exchange Traded Funds
  "IDR",              // Indian Depository Receipts
  "CIS",              // Collective Investment Schemes
  "GOVT_SECURITIES",  // Government securities
  "NPS",              // National Pension Scheme
  "GSTR",             // GST Returns
  "OTHER"
]);

export const consentModeEnum = pgEnum("consent_mode", [
  "VIEW",    // View-only access
  "STORE",   // Store data
  "QUERY",   // Query capability
  "STREAM"   // Real-time streaming
]);

export const fetchTypeEnum = pgEnum("fetch_type", [
  "ONETIME",   // One-time fetch
  "PERIODIC"   // Periodic/recurring fetch
]);

// Users table
// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: text("phone"),  // Keeping for NRI onboarding flow
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Risk Profiles table
export const riskProfiles = pgTable("risk_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100
  investmentHorizon: integer("investment_horizon").notNull(), // in months
  monthlyIncome: decimal("monthly_income", { precision: 15, scale: 2 }),
  monthlyExpenses: decimal("monthly_expenses", { precision: 15, scale: 2 }),
  dependents: integer("dependents").default(0),
  investmentGoals: text("investment_goals").array(),
  assessmentDate: timestamp("assessment_date").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRiskProfileSchema = createInsertSchema(riskProfiles).omit({
  id: true,
  assessmentDate: true,
  updatedAt: true,
});

export type InsertRiskProfile = z.infer<typeof insertRiskProfileSchema>;
export type RiskProfile = typeof riskProfiles.$inferSelect;

// Account Aggregator Tables

// AA Consents - tracks consent lifecycle
export const aaConsents = pgTable("aa_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentHandle: text("consent_handle").notNull().unique(),
  consentId: text("consent_id").unique(), // FINVU consent ID (set when approved)
  fiuId: text("fiu_id").notNull(),
  status: consentStatusEnum("status").notNull().default("PENDING"),
  consentMode: consentModeEnum("consent_mode").notNull().default("VIEW"),
  fetchType: fetchTypeEnum("fetch_type").notNull().default("ONETIME"),
  fiTypes: fiTypeEnum("fi_types").array().notNull(),
  purpose: text("purpose").notNull(),
  consentStart: timestamp("consent_start").notNull(),
  consentExpiry: timestamp("consent_expiry").notNull(),
  dataRangeFrom: timestamp("data_range_from").notNull(),
  dataRangeTo: timestamp("data_range_to").notNull(),
  frequencyUnit: text("frequency_unit"), // MONTH, YEAR, DAY, etc.
  frequencyValue: integer("frequency_value"), // e.g., 1, 2, 6
  dataLifeUnit: text("data_life_unit"), // How long to store data
  dataLifeValue: integer("data_life_value"),
  fiDataRangeMonths: integer("fi_data_range_months"), // Convenience field
  metadata: jsonb("metadata"), // Additional consent details
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_aa_consents_user_id").on(table.userId),
  index("idx_aa_consents_consent_id").on(table.consentId),
  index("idx_aa_consents_status").on(table.status),
]);

export const insertAAConsentSchema = createInsertSchema(aaConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAAConsent = z.infer<typeof insertAAConsentSchema>;
export type AAConsent = typeof aaConsents.$inferSelect;

// AA Consent Events - audit trail of consent status changes
export const aaConsentEvents = pgTable("aa_consent_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consentHandle: text("consent_handle").notNull(), // Use handle instead of FK to avoid FINVU ID conflict
  previousStatus: consentStatusEnum("previous_status"),
  newStatus: consentStatusEnum("new_status").notNull(),
  eventType: text("event_type").notNull(), // CREATED, APPROVED, REJECTED, REVOKED, EXPIRED
  eventSource: text("event_source").notNull(), // USER, SYSTEM, WEBHOOK, API
  metadata: jsonb("metadata"), // Additional event data (includes FINVU consent ID if available)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_aa_consent_events_handle").on(table.consentHandle),
]);

export const insertAAConsentEventSchema = createInsertSchema(aaConsentEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertAAConsentEvent = z.infer<typeof insertAAConsentEventSchema>;
export type AAConsentEvent = typeof aaConsentEvents.$inferSelect;

// FI Accounts - linked financial accounts from AA
export const fiAccounts = pgTable("fi_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentId: varchar("consent_id").notNull().references(() => aaConsents.id, { onDelete: "cascade", onUpdate: "cascade" }),
  linkRefNumber: text("link_ref_number").unique(), // AA link reference
  fiType: fiTypeEnum("fi_type").notNull(),
  accountId: text("account_id").notNull(), // Institution's account ID
  maskedAccountNumber: text("masked_account_number"),
  fipId: text("fip_id").notNull(), // Financial Information Provider ID
  fipName: text("fip_name"),
  accountType: text("account_type"), // Savings, Current, Demat, etc.
  accountStatus: text("account_status").notNull().default("ACTIVE"), // ACTIVE, INACTIVE, CLOSED
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
  lastFetchedAt: timestamp("last_fetched_at"),
  metadata: jsonb("metadata"), // Additional account details
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fi_accounts_user_id").on(table.userId),
  index("idx_fi_accounts_consent_id").on(table.consentId),
  index("idx_fi_accounts_fip_id").on(table.fipId),
  // Unique composite index to prevent duplicate accounts
  uniqueIndex("idx_fi_accounts_unique").on(table.userId, table.accountId, table.fiType),
]);

export const insertFIAccountSchema = createInsertSchema(fiAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFIAccount = z.infer<typeof insertFIAccountSchema>;
export type FIAccount = typeof fiAccounts.$inferSelect;

// FI Holdings - holdings data from FI accounts
export const fiHoldings = pgTable("fi_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => fiAccounts.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id"), // References fi_batches for raw data
  fiType: fiTypeEnum("fi_type").notNull(),
  
  // Common fields across all FI types
  instrumentName: text("instrument_name"),
  instrumentId: text("instrument_id"), // ISIN, AMC code, policy number, etc. (nullable - FINVU may omit)
  quantity: decimal("quantity", { precision: 15, scale: 4 }),
  averagePrice: decimal("average_price", { precision: 15, scale: 2 }),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }),
  investedAmount: decimal("invested_amount", { precision: 15, scale: 2 }),
  
  // Type-specific data stored in JSONB
  holdingDetails: jsonb("holding_details"), // MF units, equity shares, policy details, etc.
  
  // Deduplication key - hash of (accountId + instrumentId + asOfDate + payload)
  // NOTE: Computation implemented in Task 4 (webhook ingestion pipeline)
  idempotencyKey: text("idempotency_key").notNull(), // Computed hash for deduplication
  
  // Metadata
  asOfDate: timestamp("as_of_date").notNull(), // Data snapshot date
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fi_holdings_account_id").on(table.accountId),
  index("idx_fi_holdings_fi_type").on(table.fiType),
  // Unique index on idempotency key to prevent duplicate holdings
  uniqueIndex("idx_fi_holdings_unique").on(table.idempotencyKey),
]);

export const insertFIHoldingSchema = createInsertSchema(fiHoldings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFIHolding = z.infer<typeof insertFIHoldingSchema>;
export type FIHolding = typeof fiHoldings.$inferSelect;

// FI Transactions - transaction history from FI accounts
export const fiTransactions = pgTable("fi_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => fiAccounts.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id"), // References fi_batches for raw data
  fiType: fiTypeEnum("fi_type").notNull(),
  
  // Common transaction fields
  transactionId: text("transaction_id"), // Institution's transaction ID (nullable - FINVU may omit)
  transactionType: text("transaction_type").notNull(), // BUY, SELL, CREDIT, DEBIT, etc.
  transactionDate: timestamp("transaction_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  narration: text("narration"),
  reference: text("reference"),
  
  // Type-specific data
  transactionDetails: jsonb("transaction_details"), // Detailed transaction data
  
  // Deduplication key - hash of (accountId + transactionId + date + amount + payload)
  // NOTE: Computation implemented in Task 4 (webhook ingestion pipeline)
  idempotencyKey: text("idempotency_key").notNull(), // Computed hash for deduplication
  
  // Metadata
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fi_transactions_account_id").on(table.accountId),
  index("idx_fi_transactions_date").on(table.transactionDate),
  // Unique index on idempotency key to prevent duplicate transactions
  uniqueIndex("idx_fi_transactions_unique").on(table.idempotencyKey),
]);

export const insertFITransactionSchema = createInsertSchema(fiTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertFITransaction = z.infer<typeof insertFITransactionSchema>;
export type FITransaction = typeof fiTransactions.$inferSelect;

// FI Batches - stores raw encrypted/decrypted FI data payloads
export const fiBatches = pgTable("fi_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consentId: varchar("consent_id").notNull().references(() => aaConsents.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(), // FINVU session ID
  fiType: fiTypeEnum("fi_type").notNull(),
  
  // Status tracking
  status: text("status").notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
  recordsFetched: integer("records_fetched").default(0),
  recordsProcessed: integer("records_processed").default(0),
  
  // Raw data storage
  rawPayload: jsonb("raw_payload"), // Decrypted FI data
  errorDetails: jsonb("error_details"), // Processing errors if any
  
  // Timestamps
  fetchStartedAt: timestamp("fetch_started_at"),
  fetchCompletedAt: timestamp("fetch_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fi_batches_consent_id").on(table.consentId),
  index("idx_fi_batches_session_id").on(table.sessionId),
]);

export const insertFIBatchSchema = createInsertSchema(fiBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFIBatch = z.infer<typeof insertFIBatchSchema>;
export type FIBatch = typeof fiBatches.$inferSelect;

// Portfolios table
export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).default("0").notNull(),
  totalInvested: decimal("total_invested", { precision: 15, scale: 2 }).default("0").notNull(),
  totalReturns: decimal("total_returns", { precision: 15, scale: 2 }).default("0").notNull(),
  returnsPercentage: decimal("returns_percentage", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  totalValue: true,
  totalInvested: true,
  totalReturns: true,
  returnsPercentage: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

// Holdings table
export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  assetType: assetTypeEnum("asset_type").notNull(),
  assetName: text("asset_name").notNull(),
  assetSymbol: text("asset_symbol"), // ticker/ISIN
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  averagePrice: decimal("average_price", { precision: 15, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 2 }).notNull(),
  investedAmount: decimal("invested_amount", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).notNull(),
  returns: decimal("returns", { precision: 15, scale: 2 }).notNull(),
  returnsPercentage: decimal("returns_percentage", { precision: 5, scale: 2 }).notNull(),
  aaAccountId: text("aa_account_id"), // Account Aggregator account reference
  metadata: jsonb("metadata"), // Additional asset-specific data
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHoldingSchema = createInsertSchema(holdings).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type Holding = typeof holdings.$inferSelect;

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  holdingId: varchar("holding_id").notNull().references(() => holdings.id, { onDelete: "cascade" }),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  fees: decimal("fees", { precision: 15, scale: 2 }).default("0"),
  transactionDate: timestamp("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Asset Allocation table
export const assetAllocations = pgTable("asset_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  assetType: assetTypeEnum("asset_type").notNull(),
  currentAllocation: decimal("current_allocation", { precision: 5, scale: 2 }).notNull(), // percentage
  recommendedAllocation: decimal("recommended_allocation", { precision: 5, scale: 2 }), // percentage
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).notNull(),
  deviation: decimal("deviation", { precision: 5, scale: 2 }), // difference from recommended
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAssetAllocationSchema = createInsertSchema(assetAllocations).omit({
  id: true,
  updatedAt: true,
});

export type InsertAssetAllocation = z.infer<typeof insertAssetAllocationSchema>;
export type AssetAllocation = typeof assetAllocations.$inferSelect;

// AI Recommendations table
export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  holdingId: varchar("holding_id").references(() => holdings.id, { onDelete: "cascade" }),
  action: recommendationActionEnum("action").notNull(),
  assetType: assetTypeEnum("asset_type"),
  assetName: text("asset_name"),
  reasoning: text("reasoning").notNull(),
  suggestedAmount: decimal("suggested_amount", { precision: 15, scale: 2 }),
  priority: integer("priority").default(5), // 1-10, 10 being highest
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0-1
  riskImpact: riskLevelEnum("risk_impact"),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }), // percentage
  aiModel: text("ai_model").default("rudo"),
  metadata: jsonb("metadata"), // Additional AI-generated insights
  isActive: integer("is_active").default(1).notNull(), // 1 = active, 0 = dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// === TIME-SERIES / ANALYTICS TABLES ===

// Mutual Fund NAV History table
export const mutualFundNavHistory = pgTable("mutual_fund_nav_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  holdingId: varchar("holding_id").notNull().references(() => holdings.id, { onDelete: "cascade" }),
  schemeCode: text("scheme_code"),
  nav: decimal("nav", { precision: 15, scale: 4 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMutualFundNavHistorySchema = createInsertSchema(mutualFundNavHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertMutualFundNavHistory = z.infer<typeof insertMutualFundNavHistorySchema>;
export type MutualFundNavHistory = typeof mutualFundNavHistory.$inferSelect;

// Stock Price History table
export const stockPriceHistory = pgTable("stock_price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  holdingId: varchar("holding_id").notNull().references(() => holdings.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  open: decimal("open", { precision: 15, scale: 2 }).notNull(),
  high: decimal("high", { precision: 15, scale: 2 }).notNull(),
  low: decimal("low", { precision: 15, scale: 2 }).notNull(),
  close: decimal("close", { precision: 15, scale: 2 }).notNull(),
  volume: decimal("volume", { precision: 15, scale: 0 }),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockPriceHistorySchema = createInsertSchema(stockPriceHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertStockPriceHistory = z.infer<typeof insertStockPriceHistorySchema>;
export type StockPriceHistory = typeof stockPriceHistory.$inferSelect;

// ===================================
// PULSE LABS MUTUAL FUND DATA SCHEMA  
// ===================================

/**
 * Mutual Fund Schemes - Master data from Pulse Labs
 */
export const pulseLabsMutualFundSchemes = pgTable("pulse_labs_mutual_fund_schemes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  schemeCode: text("scheme_code").notNull().unique(),
  schemeName: text("scheme_name").notNull(),
  isin: text("isin"),
  amcCode: text("amc_code"),
  amcName: text("amc_name"),
  category: text("category"),
  subCategory: text("sub_category"),
  schemeType: text("scheme_type"),
  navDate: text("nav_date"),
  currentNav: decimal("current_nav", { precision: 12, scale: 4 }),
  rating: integer("rating"),
  riskLevel: text("risk_level"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  schemeCodeIdx: index("idx_pl_scheme_code").on(table.schemeCode),
  isinIdx: index("idx_pl_isin").on(table.isin),
  categoryIdx: index("idx_pl_category").on(table.category),
  amcCodeIdx: index("idx_pl_amc_code").on(table.amcCode)
}));

export type PulseLabsMutualFundScheme = typeof pulseLabsMutualFundSchemes.$inferSelect;
export const insertPulseLabsMutualFundSchemeSchema = createInsertSchema(pulseLabsMutualFundSchemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPulseLabsMutualFundScheme = z.infer<typeof insertPulseLabsMutualFundSchemeSchema>;
