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
  type AssetLinkSession,
  type InsertAssetLinkSession,
  type FinancialAccount,
  type InsertFinancialAccount,
  type MutualFundAccount,
  type InsertMutualFundAccount,
  type StockAccount,
  type InsertStockAccount,
  type BankAccount,
  type InsertBankAccount,
  type InsurancePolicy,
  type InsertInsurancePolicy,
  type MutualFundNavHistory,
  type InsertMutualFundNavHistory,
  type StockPriceHistory,
  type InsertStockPriceHistory,
  type InsurancePremiumSchedule,
  type InsertInsurancePremiumSchedule,
  type DepositSchedule,
  type InsertDepositSchedule,
  type PulseLabsMutualFundScheme,
  type InsertPulseLabsMutualFundScheme,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  // (IMPORTANT) getUser and upsertUser are mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Portfolio operations
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getPortfoliosByUserId(userId: string): Promise<Portfolio[]>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined>;
  deletePortfolio(id: string): Promise<boolean>;
  
  // Holding operations
  getHolding(id: string): Promise<Holding | undefined>;
  getHoldingsByPortfolioId(portfolioId: string): Promise<Holding[]>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: string, updates: Partial<Holding>): Promise<Holding | undefined>;
  deleteHolding(id: string): Promise<boolean>;
  
  // Transaction operations
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByPortfolioId(portfolioId: string): Promise<Transaction[]>;
  getTransactionsByHoldingId(holdingId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Risk Profile operations
  getRiskProfile(id: string): Promise<RiskProfile | undefined>;
  getRiskProfileByUserId(userId: string): Promise<RiskProfile | undefined>;
  createRiskProfile(profile: InsertRiskProfile): Promise<RiskProfile>;
  updateRiskProfile(id: string, updates: Partial<RiskProfile>): Promise<RiskProfile | undefined>;
  
  // Asset Allocation operations
  getAssetAllocation(id: string): Promise<AssetAllocation | undefined>;
  getAssetAllocationsByPortfolioId(portfolioId: string): Promise<AssetAllocation[]>;
  createAssetAllocation(allocation: InsertAssetAllocation): Promise<AssetAllocation>;
  updateAssetAllocation(id: string, updates: Partial<AssetAllocation>): Promise<AssetAllocation | undefined>;
  
  // Recommendation operations
  getRecommendation(id: string): Promise<Recommendation | undefined>;
  getRecommendationsByPortfolioId(portfolioId: string): Promise<Recommendation[]>;
  getActiveRecommendationsByPortfolioId(portfolioId: string): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation | undefined>;
  dismissRecommendation(id: string): Promise<boolean>;
  acceptRecommendation(id: string): Promise<boolean>;
  deferRecommendation(id: string): Promise<boolean>;
  
  // Account Aggregator Consent operations
  getAAConsent(id: string): Promise<AAConsent | undefined>;
  getAAConsentByConsentId(consentId: string): Promise<AAConsent | undefined>;
  getAAConsentByUserId(userId: string): Promise<AAConsent[]>;
  getAAConsentByHandle(consentHandle: string): Promise<AAConsent | undefined>;
  createAAConsent(consent: InsertAAConsent): Promise<AAConsent>;
  updateAAConsent(id: string, updates: Partial<AAConsent>): Promise<AAConsent | undefined>;
  
  // AA Consent Event logging (for audit trail)
  createAAConsentEvent(event: { consentHandle: string; eventType: string; eventData: any }): Promise<void>;
  
  // FI Batch operations (for webhook idempotency)
  createFIBatch(batch: { userId?: string | null; consentHandle?: string | null; sessionId: string; status: string; rawPayload: any }): Promise<string>;
  
  // FI Account operations (for Account Aggregator linked accounts)
  upsertFIAccount(account: {
    userId: string;
    consentId: string;
    fiType: string;
    accountId: string;
    maskedAccountNumber?: string;
    fipId: string;
    accountType?: string;
    accountStatus?: string;
    metadata?: any;
  }): Promise<{ id: string }>;
  
  // FI Holdings operations (with idempotency)
  upsertFIHolding(holding: {
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
  }): Promise<void>;
  
  // FI Transaction operations (with idempotency)
  upsertFITransaction(transaction: {
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
  }): Promise<void>;
  
  // Asset Link Session operations
  getAssetLinkSession(id: string): Promise<AssetLinkSession | undefined>;
  getAssetLinkSessionsByUserId(userId: string): Promise<AssetLinkSession[]>;
  createAssetLinkSession(session: InsertAssetLinkSession): Promise<AssetLinkSession>;
  updateAssetLinkSession(id: string, updates: Partial<AssetLinkSession>): Promise<AssetLinkSession | undefined>;
  
  // Financial Account operations  
  getFinancialAccount(id: string): Promise<FinancialAccount | undefined>;
  getFinancialAccountsByUserId(userId: string): Promise<FinancialAccount[]>;
  getFinancialAccountsByAssetType(userId: string, assetType: string): Promise<FinancialAccount[]>;
  createFinancialAccount(account: InsertFinancialAccount): Promise<FinancialAccount>;
  updateFinancialAccount(id: string, updates: Partial<FinancialAccount>): Promise<FinancialAccount | undefined>;
  
  // Mutual Fund Account operations
  getMutualFundAccountsByFinancialAccountId(financialAccountId: string): Promise<MutualFundAccount[]>;
  createMutualFundAccount(account: InsertMutualFundAccount): Promise<MutualFundAccount>;
  
  // Stock Account operations
  getStockAccountsByFinancialAccountId(financialAccountId: string): Promise<StockAccount[]>;
  createStockAccount(account: InsertStockAccount): Promise<StockAccount>;
  
  // Bank Account operations
  getBankAccountsByFinancialAccountId(financialAccountId: string): Promise<BankAccount[]>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  
  // Insurance Policy operations
  getInsurancePoliciesByFinancialAccountId(financialAccountId: string): Promise<InsurancePolicy[]>;
  createInsurancePolicy(policy: InsertInsurancePolicy): Promise<InsurancePolicy>;
  
  // Analytics operations (history/schedules)
  getMutualFundNavHistory(holdingId: string): Promise<MutualFundNavHistory[]>;
  getStockPriceHistory(holdingId: string): Promise<StockPriceHistory[]>;
  getInsurancePremiumSchedules(policyId: string): Promise<InsurancePremiumSchedule[]>;
  getDepositSchedules(bankAccountId: string): Promise<DepositSchedule[]>;
  
  // Pulse Labs Mutual Fund operations
  searchPulseLabsSchemes(query: string): Promise<PulseLabsMutualFundScheme[]>;
  getPulseLabsScheme(schemeCode: string): Promise<PulseLabsMutualFundScheme | undefined>;
  upsertPulseLabsScheme(scheme: InsertPulseLabsMutualFundScheme): Promise<PulseLabsMutualFundScheme>;
  getPulseLabsSchemesByCategory(category: string): Promise<PulseLabsMutualFundScheme[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private portfolios: Map<string, Portfolio>;
  private holdings: Map<string, Holding>;
  private transactions: Map<string, Transaction>;
  private riskProfiles: Map<string, RiskProfile>;
  private assetAllocations: Map<string, AssetAllocation>;
  private recommendations: Map<string, Recommendation>;
  private aaConsents: Map<string, AAConsent>;
  private assetLinkSessions: Map<string, AssetLinkSession>;
  private financialAccounts: Map<string, FinancialAccount>;
  private mutualFundAccounts: Map<string, MutualFundAccount>;
  private stockAccounts: Map<string, StockAccount>;
  private bankAccounts: Map<string, BankAccount>;
  private insurancePolicies: Map<string, InsurancePolicy>;
  private mutualFundNavHistory: Map<string, MutualFundNavHistory>;
  private stockPriceHistory: Map<string, StockPriceHistory>;
  private insurancePremiumSchedules: Map<string, InsurancePremiumSchedule>;
  private depositSchedules: Map<string, DepositSchedule>;
  private pulseLabsSchemes: Map<string, PulseLabsMutualFundScheme>;

  constructor() {
    this.users = new Map();
    this.portfolios = new Map();
    this.holdings = new Map();
    this.transactions = new Map();
    this.riskProfiles = new Map();
    this.assetAllocations = new Map();
    this.recommendations = new Map();
    this.aaConsents = new Map();
    this.assetLinkSessions = new Map();
    this.financialAccounts = new Map();
    this.mutualFundAccounts = new Map();
    this.stockAccounts = new Map();
    this.bankAccounts = new Map();
    this.insurancePolicies = new Map();
    this.mutualFundNavHistory = new Map();
    this.stockPriceHistory = new Map();
    this.insurancePremiumSchedules = new Map();
    this.depositSchedules = new Map();
    this.pulseLabsSchemes = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      email: insertUser.email ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      phone: insertUser.phone ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // (IMPORTANT) upsertUser is mandatory for Replit Auth
  async upsertUser(userData: UpsertUser): Promise<User> {
    // If user exists (by id), update; otherwise create new
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    
    if (existingUser) {
      const updated: User = {
        ...existingUser,
        ...userData,
        id: existingUser.id,
        updatedAt: new Date(),
      };
      this.users.set(existingUser.id, updated);
      return updated;
    } else {
      const id = userData.id || randomUUID();
      const user: User = {
        id,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        phone: userData.phone ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);
      return user;
    }
  }

  // Portfolio operations
  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    return this.portfolios.get(id);
  }

  async getPortfoliosByUserId(userId: string): Promise<Portfolio[]> {
    return Array.from(this.portfolios.values()).filter(
      (portfolio) => portfolio.userId === userId
    );
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const portfolio: Portfolio = {
      ...insertPortfolio,
      description: insertPortfolio.description ?? null,
      id,
      totalValue: "0",
      totalInvested: "0",
      totalReturns: "0",
      returnsPercentage: "0",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const portfolio = this.portfolios.get(id);
    if (!portfolio) return undefined;
    
    const updated = { ...portfolio, ...updates, updatedAt: new Date() };
    this.portfolios.set(id, updated);
    return updated;
  }

  async deletePortfolio(id: string): Promise<boolean> {
    return this.portfolios.delete(id);
  }

  // Holding operations
  async getHolding(id: string): Promise<Holding | undefined> {
    return this.holdings.get(id);
  }

  async getHoldingsByPortfolioId(portfolioId: string): Promise<Holding[]> {
    return Array.from(this.holdings.values()).filter(
      (holding) => holding.portfolioId === portfolioId
    );
  }

  async createHolding(insertHolding: InsertHolding): Promise<Holding> {
    const id = randomUUID();
    const holding: Holding = {
      ...insertHolding,
      assetSymbol: insertHolding.assetSymbol ?? null,
      aaAccountId: insertHolding.aaAccountId ?? null,
      metadata: insertHolding.metadata ?? null,
      id,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    this.holdings.set(id, holding);
    return holding;
  }

  async updateHolding(id: string, updates: Partial<Holding>): Promise<Holding | undefined> {
    const holding = this.holdings.get(id);
    if (!holding) return undefined;
    
    const updated = { ...holding, ...updates, lastUpdated: new Date() };
    this.holdings.set(id, updated);
    return updated;
  }

  async deleteHolding(id: string): Promise<boolean> {
    return this.holdings.delete(id);
  }

  // Transaction operations
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByPortfolioId(portfolioId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.portfolioId === portfolioId
    );
  }

  async getTransactionsByHoldingId(holdingId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.holdingId === holdingId
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      fees: insertTransaction.fees ?? null,
      notes: insertTransaction.notes ?? null,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  // Risk Profile operations
  async getRiskProfile(id: string): Promise<RiskProfile | undefined> {
    return this.riskProfiles.get(id);
  }

  async getRiskProfileByUserId(userId: string): Promise<RiskProfile | undefined> {
    return Array.from(this.riskProfiles.values()).find(
      (profile) => profile.userId === userId
    );
  }

  async createRiskProfile(insertProfile: InsertRiskProfile): Promise<RiskProfile> {
    const id = randomUUID();
    const profile: RiskProfile = {
      ...insertProfile,
      monthlyIncome: insertProfile.monthlyIncome ?? null,
      monthlyExpenses: insertProfile.monthlyExpenses ?? null,
      dependents: insertProfile.dependents ?? null,
      investmentGoals: insertProfile.investmentGoals ?? null,
      id,
      assessmentDate: new Date(),
      updatedAt: new Date(),
    };
    this.riskProfiles.set(id, profile);
    return profile;
  }

  async updateRiskProfile(id: string, updates: Partial<RiskProfile>): Promise<RiskProfile | undefined> {
    const profile = this.riskProfiles.get(id);
    if (!profile) return undefined;
    
    const updated = { ...profile, ...updates, updatedAt: new Date() };
    this.riskProfiles.set(id, updated);
    return updated;
  }

  // Asset Allocation operations
  async getAssetAllocation(id: string): Promise<AssetAllocation | undefined> {
    return this.assetAllocations.get(id);
  }

  async getAssetAllocationsByPortfolioId(portfolioId: string): Promise<AssetAllocation[]> {
    return Array.from(this.assetAllocations.values()).filter(
      (allocation) => allocation.portfolioId === portfolioId
    );
  }

  async createAssetAllocation(insertAllocation: InsertAssetAllocation): Promise<AssetAllocation> {
    const id = randomUUID();
    const allocation: AssetAllocation = {
      ...insertAllocation,
      recommendedAllocation: insertAllocation.recommendedAllocation ?? null,
      deviation: insertAllocation.deviation ?? null,
      id,
      updatedAt: new Date(),
    };
    this.assetAllocations.set(id, allocation);
    return allocation;
  }

  async updateAssetAllocation(id: string, updates: Partial<AssetAllocation>): Promise<AssetAllocation | undefined> {
    const allocation = this.assetAllocations.get(id);
    if (!allocation) return undefined;
    
    const updated = { ...allocation, ...updates, updatedAt: new Date() };
    this.assetAllocations.set(id, updated);
    return updated;
  }

  // Recommendation operations
  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    return this.recommendations.get(id);
  }

  async getRecommendationsByPortfolioId(portfolioId: string): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      (rec) => rec.portfolioId === portfolioId
    );
  }

  async getActiveRecommendationsByPortfolioId(portfolioId: string): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      (rec) => rec.portfolioId === portfolioId && rec.isActive === 1
    );
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const id = randomUUID();
    const recommendation: Recommendation = {
      ...insertRecommendation,
      holdingId: insertRecommendation.holdingId ?? null,
      assetType: insertRecommendation.assetType ?? null,
      assetName: insertRecommendation.assetName ?? null,
      suggestedAmount: insertRecommendation.suggestedAmount ?? null,
      priority: insertRecommendation.priority ?? null,
      confidence: insertRecommendation.confidence ?? null,
      riskImpact: insertRecommendation.riskImpact ?? null,
      expectedReturn: insertRecommendation.expectedReturn ?? null,
      aiModel: insertRecommendation.aiModel ?? null,
      metadata: insertRecommendation.metadata ?? null,
      isActive: insertRecommendation.isActive ?? 1,
      expiresAt: insertRecommendation.expiresAt ?? null,
      id,
      createdAt: new Date(),
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  async updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation | undefined> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return undefined;
    
    const updated = { ...recommendation, ...updates };
    this.recommendations.set(id, updated);
    return updated;
  }

  async dismissRecommendation(id: string): Promise<boolean> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return false;
    
    recommendation.isActive = 0;
    recommendation.metadata = {
      ...recommendation.metadata as any,
      userAction: 'dismissed',
      actionTimestamp: new Date().toISOString(),
    };
    this.recommendations.set(id, recommendation);
    return true;
  }

  async acceptRecommendation(id: string): Promise<boolean> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return false;
    
    recommendation.isActive = 0;
    recommendation.metadata = {
      ...recommendation.metadata as any,
      userAction: 'accepted',
      actionTimestamp: new Date().toISOString(),
    };
    this.recommendations.set(id, recommendation);
    return true;
  }

  async deferRecommendation(id: string): Promise<boolean> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return false;
    
    recommendation.isActive = 0;
    recommendation.metadata = {
      ...recommendation.metadata as any,
      userAction: 'deferred',
      actionTimestamp: new Date().toISOString(),
    };
    this.recommendations.set(id, recommendation);
    return true;
  }

  // Account Aggregator Consent operations
  async getAAConsent(id: string): Promise<AAConsent | undefined> {
    return this.aaConsents.get(id);
  }

  async getAAConsentByConsentId(consentId: string): Promise<AAConsent | undefined> {
    return Array.from(this.aaConsents.values()).find(
      (consent) => consent.consentId === consentId
    );
  }

  async getAAConsentByUserId(userId: string): Promise<AAConsent[]> {
    return Array.from(this.aaConsents.values()).filter(
      (consent) => consent.userId === userId
    );
  }

  async getAAConsentByHandle(consentHandle: string): Promise<AAConsent | undefined> {
    return Array.from(this.aaConsents.values()).find(
      (consent) => consent.consentHandle === consentHandle
    );
  }

  async createAAConsent(insertConsent: InsertAAConsent): Promise<AAConsent> {
    const id = randomUUID();
    const consent: AAConsent = {
      ...insertConsent,
      accountsLinked: insertConsent.accountsLinked ?? null,
      dataRange: insertConsent.dataRange ?? null,
      frequency: insertConsent.frequency ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.aaConsents.set(id, consent);
    return consent;
  }

  async updateAAConsent(id: string, updates: Partial<AAConsent>): Promise<AAConsent | undefined> {
    const consent = this.aaConsents.get(id);
    if (!consent) return undefined;
    
    const updated = { ...consent, ...updates, updatedAt: new Date() };
    this.aaConsents.set(id, updated);
    return updated;
  }

  async createAAConsentEvent(event: { consentHandle: string; eventType: string; eventData: any }): Promise<void> {
    // For MemStorage, just log the event
    // In production with DB storage, this would insert into aa_consent_events table
    console.log('[Storage] AA Consent Event:', {
      consentHandle: event.consentHandle,
      eventType: event.eventType,
      timestamp: new Date().toISOString(),
    });
  }

  async createFIBatch(batch: { userId?: string | null; consentHandle?: string | null; sessionId: string; status: string; rawPayload: any }): Promise<string> {
    // For MemStorage, just log and return an ID
    // In production with DB storage, this would insert into fi_batches table
    const batchId = randomUUID();
    console.log('[Storage] FI Batch Created:', {
      batchId,
      sessionId: batch.sessionId,
      status: batch.status,
      timestamp: new Date().toISOString(),
    });
    return batchId;
  }

  // FI Account operations (for Account Aggregator linked accounts)
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
    // Check if account already exists by userId + accountId + fiType
    const existingKey = `${account.userId}:${account.accountId}:${account.fiType}`;
    
    // For MemStorage, use a simple map keyed by the composite key
    const id = existingKey;
    console.log('[Storage] FI Account Upserted:', {
      id,
      userId: account.userId,
      accountId: account.accountId,
      fiType: account.fiType,
      fipId: account.fipId,
    });
    
    return { id };
  }

  // FI Holdings operations (with idempotency)
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
    // Use idempotency key to deduplicate holdings
    console.log('[Storage] FI Holding Upserted:', {
      accountId: holding.accountId,
      instrumentName: holding.instrumentName,
      instrumentId: holding.instrumentId,
      currentValue: holding.currentValue,
      idempotencyKey: holding.idempotencyKey?.substring(0, 16) + '...',
    });
  }

  // FI Transaction operations (with idempotency)
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
    // Use idempotency key to deduplicate transactions
    console.log('[Storage] FI Transaction Upserted:', {
      accountId: transaction.accountId,
      transactionId: transaction.transactionId,
      type: transaction.transactionType,
      amount: transaction.amount,
      idempotencyKey: transaction.idempotencyKey?.substring(0, 16) + '...',
    });
  }

  // Asset Link Session operations
  async getAssetLinkSession(id: string): Promise<AssetLinkSession | undefined> {
    return this.assetLinkSessions.get(id);
  }

  async getAssetLinkSessionsByUserId(userId: string): Promise<AssetLinkSession[]> {
    return Array.from(this.assetLinkSessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  async createAssetLinkSession(insertSession: InsertAssetLinkSession): Promise<AssetLinkSession> {
    const id = randomUUID();
    const session: AssetLinkSession = {
      ...insertSession,
      status: insertSession.status ?? "pending",
      institutionId: insertSession.institutionId ?? null,
      aaConsentId: insertSession.aaConsentId ?? null,
      otpRequired: insertSession.otpRequired ?? 0,
      otpSentAt: insertSession.otpSentAt ?? null,
      errorMessage: insertSession.errorMessage ?? null,
      metadata: insertSession.metadata ?? null,
      id,
      createdAt: new Date(),
      completedAt: null,
    };
    this.assetLinkSessions.set(id, session);
    return session;
  }

  async updateAssetLinkSession(id: string, updates: Partial<AssetLinkSession>): Promise<AssetLinkSession | undefined> {
    const session = this.assetLinkSessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates };
    this.assetLinkSessions.set(id, updated);
    return updated;
  }

  // Financial Account operations
  async getFinancialAccount(id: string): Promise<FinancialAccount | undefined> {
    return this.financialAccounts.get(id);
  }

  async getFinancialAccountsByUserId(userId: string): Promise<FinancialAccount[]> {
    return Array.from(this.financialAccounts.values()).filter(
      (account) => account.userId === userId
    );
  }

  async getFinancialAccountsByAssetType(userId: string, assetType: string): Promise<FinancialAccount[]> {
    return Array.from(this.financialAccounts.values()).filter(
      (account) => account.userId === userId && account.assetType === assetType
    );
  }

  async createFinancialAccount(insertAccount: InsertFinancialAccount): Promise<FinancialAccount> {
    const id = randomUUID();
    const account: FinancialAccount = {
      ...insertAccount,
      linkSessionId: insertAccount.linkSessionId ?? null,
      accountNumber: insertAccount.accountNumber ?? null,
      accountName: insertAccount.accountName ?? null,
      isActive: insertAccount.isActive ?? 1,
      lastSyncedAt: insertAccount.lastSyncedAt ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.financialAccounts.set(id, account);
    return account;
  }

  async updateFinancialAccount(id: string, updates: Partial<FinancialAccount>): Promise<FinancialAccount | undefined> {
    const account = this.financialAccounts.get(id);
    if (!account) return undefined;
    
    const updated = { ...account, ...updates, updatedAt: new Date() };
    this.financialAccounts.set(id, updated);
    return updated;
  }

  // Mutual Fund Account operations
  async getMutualFundAccountsByFinancialAccountId(financialAccountId: string): Promise<MutualFundAccount[]> {
    return Array.from(this.mutualFundAccounts.values()).filter(
      (account) => account.financialAccountId === financialAccountId
    );
  }

  async createMutualFundAccount(insertAccount: InsertMutualFundAccount): Promise<MutualFundAccount> {
    const id = randomUUID();
    const account: MutualFundAccount = {
      ...insertAccount,
      registrarName: insertAccount.registrarName ?? null,
      pan: insertAccount.pan ?? null,
      hasSip: insertAccount.hasSip ?? 0,
      sipAmount: insertAccount.sipAmount ?? null,
      sipFrequency: insertAccount.sipFrequency ?? null,
      sipDate: insertAccount.sipDate ?? null,
      sipStartDate: insertAccount.sipStartDate ?? null,
      sipEndDate: insertAccount.sipEndDate ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mutualFundAccounts.set(id, account);
    return account;
  }

  // Stock Account operations
  async getStockAccountsByFinancialAccountId(financialAccountId: string): Promise<StockAccount[]> {
    return Array.from(this.stockAccounts.values()).filter(
      (account) => account.financialAccountId === financialAccountId
    );
  }

  async createStockAccount(insertAccount: InsertStockAccount): Promise<StockAccount> {
    const id = randomUUID();
    const account: StockAccount = {
      ...insertAccount,
      dpId: insertAccount.dpId ?? null,
      clientId: insertAccount.clientId ?? null,
      tradingAccountNumber: insertAccount.tradingAccountNumber ?? null,
      pan: insertAccount.pan ?? null,
      autoImportEnabled: insertAccount.autoImportEnabled ?? 1,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.stockAccounts.set(id, account);
    return account;
  }

  // Bank Account operations
  async getBankAccountsByFinancialAccountId(financialAccountId: string): Promise<BankAccount[]> {
    return Array.from(this.bankAccounts.values()).filter(
      (account) => account.financialAccountId === financialAccountId
    );
  }

  async createBankAccount(insertAccount: InsertBankAccount): Promise<BankAccount> {
    const id = randomUUID();
    const account: BankAccount = {
      ...insertAccount,
      ifscCode: insertAccount.ifscCode ?? null,
      branchName: insertAccount.branchName ?? null,
      nomineeName: insertAccount.nomineeName ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bankAccounts.set(id, account);
    return account;
  }

  // Insurance Policy operations
  async getInsurancePoliciesByFinancialAccountId(financialAccountId: string): Promise<InsurancePolicy[]> {
    return Array.from(this.insurancePolicies.values()).filter(
      (policy) => policy.financialAccountId === financialAccountId
    );
  }

  async createInsurancePolicy(insertPolicy: InsertInsurancePolicy): Promise<InsurancePolicy> {
    const id = randomUUID();
    const policy: InsurancePolicy = {
      ...insertPolicy,
      premiumFrequency: insertPolicy.premiumFrequency ?? null,
      policyMaturityDate: insertPolicy.policyMaturityDate ?? null,
      nomineeName: insertPolicy.nomineeName ?? null,
      nomineeRelation: insertPolicy.nomineeRelation ?? null,
      isActive: insertPolicy.isActive ?? 1,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.insurancePolicies.set(id, policy);
    return policy;
  }

  // Analytics operations (history/schedules)
  async getMutualFundNavHistory(holdingId: string): Promise<MutualFundNavHistory[]> {
    return Array.from(this.mutualFundNavHistory.values()).filter(
      (history) => history.holdingId === holdingId
    );
  }

  async getStockPriceHistory(holdingId: string): Promise<StockPriceHistory[]> {
    return Array.from(this.stockPriceHistory.values()).filter(
      (history) => history.holdingId === holdingId
    );
  }

  async getInsurancePremiumSchedules(policyId: string): Promise<InsurancePremiumSchedule[]> {
    return Array.from(this.insurancePremiumSchedules.values()).filter(
      (schedule) => schedule.policyId === policyId
    );
  }

  async getDepositSchedules(bankAccountId: string): Promise<DepositSchedule[]> {
    return Array.from(this.depositSchedules.values()).filter(
      (schedule) => schedule.bankAccountId === bankAccountId
    );
  }

  // Pulse Labs Mutual Fund operations
  async searchPulseLabsSchemes(query: string): Promise<PulseLabsMutualFundScheme[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.pulseLabsSchemes.values()).filter(
      (scheme) =>
        scheme.schemeName?.toLowerCase().includes(lowerQuery) ||
        scheme.schemeCode?.toLowerCase().includes(lowerQuery) ||
        scheme.isin?.toLowerCase().includes(lowerQuery)
    );
  }

  async getPulseLabsScheme(schemeCode: string): Promise<PulseLabsMutualFundScheme | undefined> {
    return Array.from(this.pulseLabsSchemes.values()).find(
      (scheme) => scheme.schemeCode === schemeCode
    );
  }

  async upsertPulseLabsScheme(insertScheme: InsertPulseLabsMutualFundScheme): Promise<PulseLabsMutualFundScheme> {
    const existing = await this.getPulseLabsScheme(insertScheme.schemeCode);
    const now = new Date();
    const schemeData: PulseLabsMutualFundScheme = {
      ...insertScheme,
      id: existing?.id || randomUUID(),
      createdAt: existing?.createdAt || now, // Set createdAt on first insert
      updatedAt: now, // Always set updatedAt (for both insert and update)
    };
    this.pulseLabsSchemes.set(schemeData.schemeCode, schemeData);
    return schemeData;
  }

  async getPulseLabsSchemesByCategory(category: string): Promise<PulseLabsMutualFundScheme[]> {
    return Array.from(this.pulseLabsSchemes.values()).filter(
      (scheme) => scheme.category === category
    );
  }
}

import { DatabaseStorage } from "./databaseStorage";

export const storage: IStorage = process.env.DATABASE_URL 
  ? new DatabaseStorage()
  : new MemStorage();
