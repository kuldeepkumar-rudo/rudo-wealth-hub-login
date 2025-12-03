# Performance Metrics - Production Migration Checklist

## Critical Changes Required for Account Aggregator Integration

### ❌ REMOVE - Hardcoded Demo Data

#### 1. Remove Synthetic Benchmark Generation
**File:** `server/services/analyticsAggregator.ts`
**Method:** `generateBenchmarkData()` (lines 225-271)

**Action:** Replace entire function with real data fetcher:
```typescript
private async getHistoricalPortfolioData(
  portfolioId: string,
  months: number = 12
): Promise<BenchmarkDataPoint[]> {
  // Fetch real transaction history
  const transactions = await storage.getTransactionHistory(portfolioId);
  
  // Calculate portfolio value at each time point
  // using actual transaction data and market prices
  const historicalData = await this.calculateHistoricalValues(
    transactions,
    months
  );
  
  return historicalData;
}
```

---

### ✅ ADD - Real Data Integration

#### 1. Create Portfolio Valuation Tracker
**New File:** `server/services/portfolioValuationService.ts`

```typescript
export class PortfolioValuationService {
  /**
   * Calculate portfolio value at specific date using transaction history
   */
  async calculatePortfolioValueAtDate(
    portfolioId: string,
    date: Date
  ): Promise<number> {
    // 1. Get all transactions up to this date
    const transactions = await storage.getTransactionsBeforeDate(
      portfolioId,
      date
    );
    
    // 2. Calculate holdings based on transactions
    const holdingsAtDate = this.calculateHoldingsFromTransactions(
      transactions
    );
    
    // 3. Fetch market prices for that date (from AA or market data API)
    const prices = await this.getHistoricalPrices(holdingsAtDate, date);
    
    // 4. Calculate total value
    return this.calculateTotalValue(holdingsAtDate, prices);
  }

  /**
   * Generate time-series of portfolio valuations
   */
  async generateHistoricalTimeSeries(
    portfolioId: string,
    startDate: Date,
    endDate: Date,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): Promise<BenchmarkDataPoint[]> {
    const dataPoints: BenchmarkDataPoint[] = [];
    const dates = this.generateDateRange(startDate, endDate, frequency);
    
    for (const date of dates) {
      const portfolioValue = await this.calculatePortfolioValueAtDate(
        portfolioId,
        date
      );
      
      const benchmarkValue = await this.getBenchmarkValueAtDate(date);
      
      dataPoints.push({
        period: this.formatPeriod(date),
        portfolioValue,
        benchmarkValue,
        date: date.toISOString().split('T')[0],
      });
    }
    
    return dataPoints;
  }
}
```

#### 2. Integrate Real Market Data for Benchmark
**New File:** `server/services/marketDataService.ts`

```typescript
export class MarketDataService {
  /**
   * Fetch historical index data (NIFTY 50, SENSEX, etc.)
   */
  async getIndexHistoricalData(
    indexSymbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; value: number }>> {
    // Option 1: Use NSE/BSE API (requires API key)
    // Option 2: Use financial data provider (Alpha Vantage, Yahoo Finance)
    // Option 3: Store daily index values in database table
    
    // Example with database storage:
    return await storage.getBenchmarkIndexData(
      indexSymbol,
      startDate,
      endDate
    );
  }
}
```

#### 3. Add Database Table for Benchmark Index Storage
**File:** `shared/schema.ts`

```typescript
// Add new table for storing benchmark index historical data
export const benchmarkIndices = pgTable("benchmark_indices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  indexSymbol: text("index_symbol").notNull(), // "NIFTY50", "SENSEX"
  date: timestamp("date").notNull(),
  closePrice: decimal("close_price", { precision: 15, scale: 2 }).notNull(),
  openPrice: decimal("open_price", { precision: 15, scale: 2 }),
  highPrice: decimal("high_price", { precision: 15, scale: 2 }),
  lowPrice: decimal("low_price", { precision: 15, scale: 2 }),
  volume: bigint("volume", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create unique constraint on symbol + date
// CREATE UNIQUE INDEX idx_benchmark_symbol_date ON benchmark_indices(index_symbol, date);
```

#### 4. Add Portfolio Snapshot Storage
**File:** `shared/schema.ts`

```typescript
// Track daily/monthly portfolio snapshots for historical analysis
export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id),
  snapshotDate: timestamp("snapshot_date").notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  totalInvested: decimal("total_invested", { precision: 15, scale: 2 }).notNull(),
  totalReturns: decimal("total_returns", { precision: 15, scale: 2 }).notNull(),
  returnsPercentage: decimal("returns_percentage", { precision: 5, scale: 2 }).notNull(),
  dataSource: text("data_source").notNull(), // "AA_SYNC", "MANUAL", "CALCULATED"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create unique constraint on portfolio + date
// CREATE UNIQUE INDEX idx_portfolio_snapshot_date ON portfolio_snapshots(portfolio_id, snapshot_date);
```

---

### 🔧 CONFIGURE - Environment Variables

#### Add to Production Environment
```bash
# Risk-free rate (configurable)
RISK_FREE_RATE=0.07

# Market data API (if using external provider)
MARKET_DATA_API_KEY=your_api_key_here
MARKET_DATA_PROVIDER=NSE # or "BSE", "YAHOO", etc.

# Default benchmark index
DEFAULT_BENCHMARK_INDEX=NIFTY50

# Portfolio snapshot frequency
SNAPSHOT_FREQUENCY=daily # or "weekly", "monthly"
```

---

### 📋 STORAGE INTERFACE UPDATES

#### Add Methods to `IStorage` Interface
**File:** `server/storage.ts`

```typescript
export interface IStorage {
  // ... existing methods ...

  // Historical data methods
  getTransactionHistory(portfolioId: string): Promise<Transaction[]>;
  getTransactionsBeforeDate(portfolioId: string, date: Date): Promise<Transaction[]>;
  getTransactionsByDateRange(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]>;

  // Benchmark index methods
  getBenchmarkIndexData(
    indexSymbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; value: number }>>;
  storeBenchmarkIndexData(
    indexSymbol: string,
    data: Array<{ date: Date; value: number }>
  ): Promise<void>;

  // Portfolio snapshot methods
  getPortfolioSnapshots(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PortfolioSnapshot[]>;
  createPortfolioSnapshot(
    portfolioId: string,
    snapshot: InsertPortfolioSnapshot
  ): Promise<PortfolioSnapshot>;
}
```

---

### 🔄 ACCOUNT AGGREGATOR INTEGRATION

#### Update AA Service to Store Historical Data
**File:** `server/services/accountAggregator.ts`

```typescript
// After fetching FI data, store historical valuations
async fetchFinancialData(request: FIDataRequest): Promise<AccountData[]> {
  const accountData = await this.makeAARequest(/* ... */);
  
  // IMPORTANT: Extract and store historical data points
  for (const account of accountData) {
    if (account.transactions) {
      // Store transactions in database
      await this.storeTransactionHistory(account.transactions);
    }
    
    if (account.holdings) {
      // Update holdings with current prices
      await this.updateHoldingPrices(account.holdings);
    }
  }
  
  // Create portfolio snapshot
  await this.createPortfolioSnapshot(request.portfolioId);
  
  return accountData;
}

private async createPortfolioSnapshot(portfolioId: string): Promise<void> {
  const portfolio = await storage.getPortfolio(portfolioId);
  
  await storage.createPortfolioSnapshot(portfolioId, {
    snapshotDate: new Date(),
    totalValue: portfolio.totalValue,
    totalInvested: portfolio.totalInvested,
    totalReturns: portfolio.totalReturns,
    returnsPercentage: portfolio.returnsPercentage,
    dataSource: "AA_SYNC",
  });
}
```

---

### ✅ TESTING CHECKLIST

Before going to production:

- [ ] Remove all `generateBenchmarkData()` synthetic data
- [ ] Implement `PortfolioValuationService` with real transaction-based calculations
- [ ] Create `benchmark_indices` and `portfolio_snapshots` tables
- [ ] Add storage methods for historical data
- [ ] Integrate market data API (NSE/BSE) or store daily index values
- [ ] Update `AnalyticsAggregator` to use real historical data
- [ ] Test with actual AA data from test accounts
- [ ] Verify performance metrics with at least 6 months of real data
- [ ] Add error handling for missing historical data
- [ ] Create migration script for existing demo portfolios
- [ ] Add logging for data sync operations
- [ ] Set up monitoring for AA data fetch failures

---

### 🎯 RECOMMENDED APPROACH

**Phase 1: Hybrid Mode (Recommended for Testing)**
```typescript
private async getBenchmarkData(portfolio: Portfolio): Promise<BenchmarkDataPoint[]> {
  // Try to get real data first
  const realData = await this.getHistoricalPortfolioData(portfolio.id);
  
  // Fallback to synthetic if insufficient real data
  if (realData.length < 6) {
    console.warn('[Analytics] Insufficient historical data, using synthetic');
    return this.generateBenchmarkData(portfolio); // Keep temporarily
  }
  
  return realData;
}
```

**Phase 2: Production Mode (After AA Data Accumulation)**
```typescript
// Remove generateBenchmarkData() completely
// Require minimum 6 months of data before showing metrics
// Show "insufficient data" message if not enough history
```

---

### 📊 DATA QUALITY REQUIREMENTS

For accurate performance metrics in production:

**Minimum Data Requirements:**
- At least **6 months** of historical data (12 months preferred)
- Daily portfolio snapshots (or at least weekly)
- Complete transaction history from account opening
- Market prices at each snapshot date

**Data Sources Priority:**
1. **Primary:** Account Aggregator real-time sync
2. **Secondary:** Manual portfolio snapshots (user-initiated)
3. **Fallback:** Calculated from transaction history + current prices

---

## Summary

**Current State:** Demo mode with synthetic data for development
**Production State:** 100% real data from Account Aggregator + market data APIs

**Key Migration:** Replace `generateBenchmarkData()` with `getHistoricalPortfolioData()` that uses real transactions and AA valuations.
