import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { IStorage } from "./storage";
import {
  type User,
  type InsertUser,
  type UpsertUser,
  type Portfolio,
  type InsertPortfolio,
  type Holding,
  type InsertHolding,
  type Transaction,
  type InsertTransaction,
  type RiskProfile,
  type InsertRiskProfile,
  type AssetAllocation,
  type InsertAssetAllocation,
  type Recommendation,
  type InsertRecommendation,
  type AAConsent,
  type InsertAAConsent,
  type PulseLabsMutualFundScheme,
  type InsertPulseLabsMutualFundScheme,
  type MutualFundNavHistory,
  type StockPriceHistory,
} from "@shared/schema";

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql = neon(databaseUrl);
    this.db = drizzle(sql, { schema });
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(schema.users).values({
      email: insertUser.email,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      profileImageUrl: insertUser.profileImageUrl,
      phone: insertUser.phone,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await this.db.insert(schema.users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        phone: userData.phone,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const result = await this.db.select().from(schema.portfolios).where(eq(schema.portfolios.id, id));
    return result[0];
  }

  async getPortfoliosByUserId(userId: string): Promise<Portfolio[]> {
    return this.db.select().from(schema.portfolios).where(eq(schema.portfolios.userId, userId));
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const result = await this.db.insert(schema.portfolios).values(portfolio).returning();
    return result[0];
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const result = await this.db.update(schema.portfolios)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.portfolios.id, id))
      .returning();
    return result[0];
  }

  async deletePortfolio(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.portfolios).where(eq(schema.portfolios.id, id)).returning();
    return result.length > 0;
  }

  async getHolding(id: string): Promise<Holding | undefined> {
    const result = await this.db.select().from(schema.holdings).where(eq(schema.holdings.id, id));
    return result[0];
  }

  async getHoldingsByPortfolioId(portfolioId: string): Promise<Holding[]> {
    return this.db.select().from(schema.holdings).where(eq(schema.holdings.portfolioId, portfolioId));
  }

  async createHolding(holding: InsertHolding): Promise<Holding> {
    const result = await this.db.insert(schema.holdings).values(holding).returning();
    return result[0];
  }

  async updateHolding(id: string, updates: Partial<Holding>): Promise<Holding | undefined> {
    const result = await this.db.update(schema.holdings)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(schema.holdings.id, id))
      .returning();
    return result[0];
  }

  async deleteHolding(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.holdings).where(eq(schema.holdings.id, id)).returning();
    return result.length > 0;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await this.db.select().from(schema.transactions).where(eq(schema.transactions.id, id));
    return result[0];
  }

  async getTransactionsByPortfolioId(portfolioId: string): Promise<Transaction[]> {
    return this.db.select().from(schema.transactions)
      .where(eq(schema.transactions.portfolioId, portfolioId))
      .orderBy(desc(schema.transactions.transactionDate));
  }

  async getTransactionsByHoldingId(holdingId: string): Promise<Transaction[]> {
    return this.db.select().from(schema.transactions)
      .where(eq(schema.transactions.holdingId, holdingId))
      .orderBy(desc(schema.transactions.transactionDate));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await this.db.insert(schema.transactions).values(transaction).returning();
    return result[0];
  }

  async getRiskProfile(id: string): Promise<RiskProfile | undefined> {
    const result = await this.db.select().from(schema.riskProfiles).where(eq(schema.riskProfiles.id, id));
    return result[0];
  }

  async getRiskProfileByUserId(userId: string): Promise<RiskProfile | undefined> {
    const result = await this.db.select().from(schema.riskProfiles).where(eq(schema.riskProfiles.userId, userId));
    return result[0];
  }

  async createRiskProfile(profile: InsertRiskProfile): Promise<RiskProfile> {
    const result = await this.db.insert(schema.riskProfiles).values(profile).returning();
    return result[0];
  }

  async updateRiskProfile(id: string, updates: Partial<RiskProfile>): Promise<RiskProfile | undefined> {
    const result = await this.db.update(schema.riskProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.riskProfiles.id, id))
      .returning();
    return result[0];
  }

  async getAssetAllocation(id: string): Promise<AssetAllocation | undefined> {
    const result = await this.db.select().from(schema.assetAllocations).where(eq(schema.assetAllocations.id, id));
    return result[0];
  }

  async getAssetAllocationsByPortfolioId(portfolioId: string): Promise<AssetAllocation[]> {
    return this.db.select().from(schema.assetAllocations).where(eq(schema.assetAllocations.portfolioId, portfolioId));
  }

  async createAssetAllocation(allocation: InsertAssetAllocation): Promise<AssetAllocation> {
    const result = await this.db.insert(schema.assetAllocations).values(allocation).returning();
    return result[0];
  }

  async updateAssetAllocation(id: string, updates: Partial<AssetAllocation>): Promise<AssetAllocation | undefined> {
    const result = await this.db.update(schema.assetAllocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.assetAllocations.id, id))
      .returning();
    return result[0];
  }

  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    const result = await this.db.select().from(schema.recommendations).where(eq(schema.recommendations.id, id));
    return result[0];
  }

  async getRecommendationsByPortfolioId(portfolioId: string): Promise<Recommendation[]> {
    return this.db.select().from(schema.recommendations).where(eq(schema.recommendations.portfolioId, portfolioId));
  }

  async getActiveRecommendationsByPortfolioId(portfolioId: string): Promise<Recommendation[]> {
    return this.db.select().from(schema.recommendations)
      .where(and(
        eq(schema.recommendations.portfolioId, portfolioId),
        eq(schema.recommendations.isActive, 1)
      ));
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const result = await this.db.insert(schema.recommendations).values(recommendation).returning();
    return result[0];
  }

  async updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation | undefined> {
    const result = await this.db.update(schema.recommendations)
      .set(updates)
      .where(eq(schema.recommendations.id, id))
      .returning();
    return result[0];
  }

  async dismissRecommendation(id: string): Promise<boolean> {
    const result = await this.db.update(schema.recommendations)
      .set({ isActive: 0 })
      .where(eq(schema.recommendations.id, id))
      .returning();
    return result.length > 0;
  }

  async acceptRecommendation(id: string): Promise<boolean> {
    const result = await this.db.update(schema.recommendations)
      .set({ isActive: 0 })
      .where(eq(schema.recommendations.id, id))
      .returning();
    return result.length > 0;
  }

  async deferRecommendation(id: string): Promise<boolean> {
    const result = await this.db.select().from(schema.recommendations)
      .where(eq(schema.recommendations.id, id));
    return result.length > 0;
  }

  async getAAConsent(id: string): Promise<AAConsent | undefined> {
    const result = await this.db.select().from(schema.aaConsents).where(eq(schema.aaConsents.id, id));
    return result[0];
  }

  async getAAConsentByConsentId(consentId: string): Promise<AAConsent | undefined> {
    const result = await this.db.select().from(schema.aaConsents).where(eq(schema.aaConsents.consentId, consentId));
    return result[0];
  }

  async getAAConsentByUserId(userId: string): Promise<AAConsent[]> {
    return this.db.select().from(schema.aaConsents).where(eq(schema.aaConsents.userId, userId));
  }

  async getAAConsentByHandle(consentHandle: string): Promise<AAConsent | undefined> {
    const result = await this.db.select().from(schema.aaConsents).where(eq(schema.aaConsents.consentHandle, consentHandle));
    return result[0];
  }

  async createAAConsent(consent: InsertAAConsent): Promise<AAConsent> {
    const result = await this.db.insert(schema.aaConsents).values(consent).returning();
    return result[0];
  }

  async updateAAConsent(id: string, updates: Partial<AAConsent>): Promise<AAConsent | undefined> {
    const result = await this.db.update(schema.aaConsents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.aaConsents.id, id))
      .returning();
    return result[0];
  }

  async createAAConsentEvent(event: { consentHandle: string; eventType: string; eventData: any }): Promise<void> {
    await this.db.insert(schema.aaConsentEvents).values({
      consentHandle: event.consentHandle,
      eventType: event.eventType,
      eventSource: 'SYSTEM',
      newStatus: 'PENDING',
      metadata: event.eventData,
    });
  }

  async createFIBatch(batch: { userId?: string | null; consentHandle?: string | null; sessionId: string; status: string; rawPayload: any }): Promise<string> {
    const consent = batch.consentHandle 
      ? await this.getAAConsentByHandle(batch.consentHandle)
      : null;
    
    if (!consent) {
      throw new Error('Cannot create FI batch without valid consent');
    }

    const result = await this.db.insert(schema.fiBatches).values({
      consentId: consent.id,
      sessionId: batch.sessionId,
      status: batch.status,
      fiType: 'DEPOSIT',
      rawPayload: batch.rawPayload,
    }).returning();
    return result[0].id;
  }

  async upsertFIAccount(account: {
    userId: string;
    consentId: string;
    fiType: string;
    accountId: string;
    maskedAccountNumber?: string;
    fipId: string;
    accountType?: string;
    accountStatus?: string;
    metadata?: any;
  }): Promise<{ id: string }> {
    const result = await this.db.insert(schema.fiAccounts).values({
      userId: account.userId,
      consentId: account.consentId,
      fiType: account.fiType as any,
      accountId: account.accountId,
      maskedAccountNumber: account.maskedAccountNumber,
      fipId: account.fipId,
      accountType: account.accountType,
      accountStatus: account.accountStatus || 'ACTIVE',
      metadata: account.metadata,
    }).onConflictDoUpdate({
      target: [schema.fiAccounts.userId, schema.fiAccounts.accountId, schema.fiAccounts.fiType],
      set: {
        consentId: account.consentId,
        maskedAccountNumber: account.maskedAccountNumber,
        fipId: account.fipId,
        accountType: account.accountType,
        accountStatus: account.accountStatus || 'ACTIVE',
        metadata: account.metadata,
        updatedAt: new Date(),
      },
    }).returning();
    return { id: result[0].id };
  }

  async upsertFIHolding(holding: {
    accountId: string;
    batchId?: string;
    fiType: string;
    instrumentName?: string;
    instrumentId?: string;
    quantity?: string;
    averagePrice?: string;
    currentValue?: string;
    investedAmount?: string;
    holdingDetails?: any;
    idempotencyKey: string;
    asOfDate: Date;
  }): Promise<void> {
    await this.db.insert(schema.fiHoldings).values({
      accountId: holding.accountId,
      batchId: holding.batchId,
      fiType: holding.fiType as any,
      instrumentName: holding.instrumentName,
      instrumentId: holding.instrumentId,
      quantity: holding.quantity,
      averagePrice: holding.averagePrice,
      currentValue: holding.currentValue,
      investedAmount: holding.investedAmount,
      holdingDetails: holding.holdingDetails,
      idempotencyKey: holding.idempotencyKey,
      asOfDate: holding.asOfDate,
    }).onConflictDoNothing();
  }

  async upsertFITransaction(transaction: {
    accountId: string;
    batchId?: string;
    fiType: string;
    transactionId?: string;
    transactionType: string;
    amount: string;
    transactionDate: Date;
    narration?: string;
    reference?: string;
    transactionDetails?: any;
    idempotencyKey: string;
  }): Promise<void> {
    await this.db.insert(schema.fiTransactions).values({
      accountId: transaction.accountId,
      batchId: transaction.batchId,
      fiType: transaction.fiType as any,
      transactionId: transaction.transactionId,
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      narration: transaction.narration,
      reference: transaction.reference,
      transactionDetails: transaction.transactionDetails,
      idempotencyKey: transaction.idempotencyKey,
    }).onConflictDoNothing();
  }

  async getAssetLinkSession(id: string): Promise<any | undefined> {
    console.warn('[DatabaseStorage] getAssetLinkSession: Table not yet in schema, returning undefined');
    return undefined;
  }

  async getAssetLinkSessionsByUserId(userId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getAssetLinkSessionsByUserId: Table not yet in schema, returning empty array');
    return [];
  }

  async createAssetLinkSession(session: any): Promise<any> {
    console.warn('[DatabaseStorage] createAssetLinkSession: Table not yet in schema, returning mock');
    return { id: 'stub-' + Date.now(), ...session, createdAt: new Date(), updatedAt: new Date() };
  }

  async updateAssetLinkSession(id: string, updates: any): Promise<any | undefined> {
    console.warn('[DatabaseStorage] updateAssetLinkSession: Table not yet in schema');
    return undefined;
  }

  async getFinancialAccount(id: string): Promise<any | undefined> {
    console.warn('[DatabaseStorage] getFinancialAccount: Table not yet in schema, returning undefined');
    return undefined;
  }

  async getFinancialAccountsByUserId(userId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getFinancialAccountsByUserId: Table not yet in schema, returning empty array');
    return [];
  }

  async getFinancialAccountsByAssetType(userId: string, assetType: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getFinancialAccountsByAssetType: Table not yet in schema, returning empty array');
    return [];
  }

  async createFinancialAccount(account: any): Promise<any> {
    console.warn('[DatabaseStorage] createFinancialAccount: Table not yet in schema, returning mock');
    return { id: 'stub-' + Date.now(), ...account, createdAt: new Date(), updatedAt: new Date() };
  }

  async updateFinancialAccount(id: string, updates: any): Promise<any | undefined> {
    console.warn('[DatabaseStorage] updateFinancialAccount: Table not yet in schema');
    return undefined;
  }

  async getMutualFundAccountsByFinancialAccountId(financialAccountId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getMutualFundAccountsByFinancialAccountId: Table not yet in schema, returning empty array');
    return [];
  }

  async createMutualFundAccount(account: any): Promise<any> {
    console.warn('[DatabaseStorage] createMutualFundAccount: Table not yet in schema, returning mock');
    return { id: 'stub-' + Date.now(), ...account, createdAt: new Date() };
  }

  async getStockAccountsByFinancialAccountId(financialAccountId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getStockAccountsByFinancialAccountId: Table not yet in schema, returning empty array');
    return [];
  }

  async createStockAccount(account: any): Promise<any> {
    console.warn('[DatabaseStorage] createStockAccount: Table not yet in schema, returning mock');
    return { id: 'stub-' + Date.now(), ...account, createdAt: new Date() };
  }

  async getBankAccountsByFinancialAccountId(financialAccountId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getBankAccountsByFinancialAccountId: Table not yet in schema, returning empty array');
    return [];
  }

  async createBankAccount(account: any): Promise<any> {
    console.warn('[DatabaseStorage] createBankAccount: Table not yet in schema, returning mock');
    return { id: 'stub-' + Date.now(), ...account, createdAt: new Date() };
  }

  async getInsurancePoliciesByFinancialAccountId(financialAccountId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getInsurancePoliciesByFinancialAccountId: Table not yet in schema, returning empty array');
    return [];
  }

  async createInsurancePolicy(policy: any): Promise<any> {
    console.warn('[DatabaseStorage] createInsurancePolicy: Table not yet in schema, returning mock');
    return { id: 'stub-' + Date.now(), ...policy, createdAt: new Date() };
  }

  async getMutualFundNavHistory(holdingId: string): Promise<MutualFundNavHistory[]> {
    return this.db.select().from(schema.mutualFundNavHistory)
      .where(eq(schema.mutualFundNavHistory.holdingId, holdingId))
      .orderBy(desc(schema.mutualFundNavHistory.date));
  }

  async getStockPriceHistory(holdingId: string): Promise<StockPriceHistory[]> {
    return this.db.select().from(schema.stockPriceHistory)
      .where(eq(schema.stockPriceHistory.holdingId, holdingId))
      .orderBy(desc(schema.stockPriceHistory.date));
  }

  async getInsurancePremiumSchedules(policyId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getInsurancePremiumSchedules: Table not yet in schema, returning empty array');
    return [];
  }

  async getDepositSchedules(bankAccountId: string): Promise<any[]> {
    console.warn('[DatabaseStorage] getDepositSchedules: Table not yet in schema, returning empty array');
    return [];
  }

  async searchPulseLabsSchemes(query: string): Promise<PulseLabsMutualFundScheme[]> {
    return this.db.select().from(schema.pulseLabsMutualFundSchemes)
      .where(or(
        ilike(schema.pulseLabsMutualFundSchemes.schemeName, `%${query}%`),
        ilike(schema.pulseLabsMutualFundSchemes.schemeCode, `%${query}%`),
        ilike(schema.pulseLabsMutualFundSchemes.isin, `%${query}%`)
      ))
      .limit(50);
  }

  async getPulseLabsScheme(schemeCode: string): Promise<PulseLabsMutualFundScheme | undefined> {
    const result = await this.db.select().from(schema.pulseLabsMutualFundSchemes)
      .where(eq(schema.pulseLabsMutualFundSchemes.schemeCode, schemeCode));
    return result[0];
  }

  async upsertPulseLabsScheme(insertScheme: InsertPulseLabsMutualFundScheme): Promise<PulseLabsMutualFundScheme> {
    const result = await this.db.insert(schema.pulseLabsMutualFundSchemes)
      .values(insertScheme)
      .onConflictDoUpdate({
        target: schema.pulseLabsMutualFundSchemes.schemeCode,
        set: {
          ...insertScheme,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getPulseLabsSchemesByCategory(category: string): Promise<PulseLabsMutualFundScheme[]> {
    return this.db.select().from(schema.pulseLabsMutualFundSchemes)
      .where(eq(schema.pulseLabsMutualFundSchemes.category, category));
  }
}
