import { storage } from "./storage";

/**
 * Seed the storage with demo data for testing and demonstration
 */
export async function seedData() {
  try {
    // Check if data already exists
    const existingUser = await storage.getUser("demo-user");
    if (existingUser) {
      console.log("Demo data already seeded");
      return;
    }

    console.log("Seeding demo data...");

    // Create demo user (using Replit Auth structure)
    const user = await storage.createUser({
      email: "demo@nriwealth.com",
      firstName: "Demo",
      lastName: "NRI User",
      phone: "+91 98765 43210",
    });
    
    // Override ID to make it predictable
    (user as any).id = "demo-user";
    (storage as any).users.delete(user.id);
    (storage as any).users.set("demo-user", user);

    // Create risk profile
    const riskProfile = await storage.createRiskProfile({
      userId: "demo-user",
      riskLevel: "moderate",
      riskScore: 55,
      investmentHorizon: 60, // 5 years
      monthlyIncome: "150000",
      monthlyExpenses: "80000",
      dependents: 2,
      investmentGoals: ["Retirement Planning", "Wealth Creation", "Tax Savings"],
    });

    // Create demo portfolio
    const portfolio = await storage.createPortfolio({
      userId: "demo-user",
      name: "Primary Investment Portfolio",
      description: "Diversified portfolio for long-term wealth creation",
    });
    
    // Override ID
    (portfolio as any).id = "demo-portfolio";
    (storage as any).portfolios.delete(portfolio.id);
    (storage as any).portfolios.set("demo-portfolio", portfolio);

    // Create holdings
    const holdings = await Promise.all([
      storage.createHolding({
        portfolioId: "demo-portfolio",
        assetType: "mutual_fund",
        assetName: "HDFC Equity Fund - Growth",
        assetSymbol: "INF179K01997",
        quantity: "1500",
        averagePrice: "95.50",
        currentPrice: "112.30",
        investedAmount: "143250.00",
        currentValue: "168450.00",
        returns: "25200.00",
        returnsPercentage: "17.59",
        aaAccountId: "AA_MF_001",
        metadata: { fundHouse: "HDFC", category: "Large Cap" },
      }),
      storage.createHolding({
        portfolioId: "demo-portfolio",
        assetType: "stock",
        assetName: "Reliance Industries Ltd",
        assetSymbol: "RELIANCE",
        quantity: "50",
        averagePrice: "2450.00",
        currentPrice: "2680.50",
        investedAmount: "122500.00",
        currentValue: "134025.00",
        returns: "11525.00",
        returnsPercentage: "9.41",
        aaAccountId: "AA_DEMAT_001",
        metadata: { exchange: "NSE", sector: "Energy" },
      }),
      storage.createHolding({
        portfolioId: "demo-portfolio",
        assetType: "stock",
        assetName: "Infosys Ltd",
        assetSymbol: "INFY",
        quantity: "80",
        averagePrice: "1420.00",
        currentPrice: "1565.25",
        investedAmount: "113600.00",
        currentValue: "125220.00",
        returns: "11620.00",
        returnsPercentage: "10.23",
        aaAccountId: "AA_DEMAT_001",
        metadata: { exchange: "NSE", sector: "IT" },
      }),
      storage.createHolding({
        portfolioId: "demo-portfolio",
        assetType: "fixed_deposit",
        assetName: "HDFC Bank FD",
        assetSymbol: null,
        quantity: "1",
        averagePrice: "200000.00",
        currentPrice: "214800.00",
        investedAmount: "200000.00",
        currentValue: "214800.00",
        returns: "14800.00",
        returnsPercentage: "7.40",
        aaAccountId: "AA_DEPOSIT_001",
        metadata: { tenure: "36 months", interestRate: "7.40%" },
      }),
      storage.createHolding({
        portfolioId: "demo-portfolio",
        assetType: "gold",
        assetName: "Gold ETF",
        assetSymbol: "GOLDBEES",
        quantity: "100",
        averagePrice: "52.50",
        currentPrice: "58.20",
        investedAmount: "5250.00",
        currentValue: "5820.00",
        returns: "570.00",
        returnsPercentage: "10.86",
        aaAccountId: "AA_DEMAT_001",
        metadata: { type: "ETF" },
      }),
    ]);

    // Update portfolio totals
    const totalInvested = holdings.reduce((sum, h) => sum + parseFloat(h.investedAmount), 0);
    const totalValue = holdings.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
    const totalReturns = totalValue - totalInvested;
    const returnsPercentage = (totalReturns / totalInvested) * 100;

    await storage.updatePortfolio("demo-portfolio", {
      totalInvested: totalInvested.toFixed(2),
      totalValue: totalValue.toFixed(2),
      totalReturns: totalReturns.toFixed(2),
      returnsPercentage: returnsPercentage.toFixed(2),
    });

    // Create transactions
    await Promise.all([
      storage.createTransaction({
        holdingId: holdings[0].id,
        portfolioId: "demo-portfolio",
        transactionType: "buy",
        quantity: "1000",
        price: "95.50",
        totalAmount: "95500.00",
        fees: "50.00",
        transactionDate: new Date("2023-06-15"),
        notes: "Initial investment in HDFC Equity Fund",
      }),
      storage.createTransaction({
        holdingId: holdings[0].id,
        portfolioId: "demo-portfolio",
        transactionType: "buy",
        quantity: "500",
        price: "95.50",
        totalAmount: "47750.00",
        fees: "25.00",
        transactionDate: new Date("2023-09-20"),
        notes: "Additional SIP investment",
      }),
      storage.createTransaction({
        holdingId: holdings[1].id,
        portfolioId: "demo-portfolio",
        transactionType: "buy",
        quantity: "50",
        price: "2450.00",
        totalAmount: "122500.00",
        fees: "100.00",
        transactionDate: new Date("2023-05-10"),
        notes: "Purchased Reliance shares",
      }),
      storage.createTransaction({
        holdingId: holdings[0].id,
        portfolioId: "demo-portfolio",
        transactionType: "dividend",
        quantity: "0",
        price: "0",
        totalAmount: "1250.00",
        fees: "0",
        transactionDate: new Date("2024-01-10"),
        notes: "Dividend received from HDFC Equity Fund",
      }),
    ]);

    // Create asset allocations
    const allocations = await Promise.all([
      storage.createAssetAllocation({
        portfolioId: "demo-portfolio",
        assetType: "mutual_fund",
        currentAllocation: "26.00",
        recommendedAllocation: "35.00",
        currentValue: "168450.00",
        deviation: "-9.00",
      }),
      storage.createAssetAllocation({
        portfolioId: "demo-portfolio",
        assetType: "stock",
        currentAllocation: "40.00",
        recommendedAllocation: "25.00",
        currentValue: "259245.00",
        deviation: "15.00",
      }),
      storage.createAssetAllocation({
        portfolioId: "demo-portfolio",
        assetType: "fixed_deposit",
        currentAllocation: "33.00",
        recommendedAllocation: "20.00",
        currentValue: "214800.00",
        deviation: "13.00",
      }),
      storage.createAssetAllocation({
        portfolioId: "demo-portfolio",
        assetType: "gold",
        currentAllocation: "1.00",
        recommendedAllocation: "10.00",
        currentValue: "5820.00",
        deviation: "-9.00",
      }),
    ]);

    // Create AI recommendations
    await Promise.all([
      storage.createRecommendation({
        portfolioId: "demo-portfolio",
        holdingId: null,
        action: "increase",
        assetType: "mutual_fund",
        assetName: "Diversified Equity Mutual Funds",
        reasoning: "Your mutual fund allocation is 9% below the recommended target for your moderate risk profile. Increasing this allocation will provide better diversification and align with your long-term wealth creation goals.",
        suggestedAmount: "50000",
        priority: 8,
        confidence: "0.85",
        expectedReturn: "12.50",
        riskImpact: "moderate",
        aiModel: "rudo",
        metadata: null,
        isActive: 1,
        expiresAt: null,
      }),
      storage.createRecommendation({
        portfolioId: "demo-portfolio",
        holdingId: holdings[1].id,
        action: "hold",
        assetType: "stock",
        assetName: "Reliance Industries Ltd",
        reasoning: "Reliance is showing strong fundamentals and steady growth. Continue holding this position as it aligns well with the energy sector exposure in your portfolio.",
        suggestedAmount: null,
        priority: 5,
        confidence: "0.78",
        expectedReturn: "10.00",
        riskImpact: "moderate",
        aiModel: "rudo",
        metadata: null,
        isActive: 1,
        expiresAt: null,
      }),
      storage.createRecommendation({
        portfolioId: "demo-portfolio",
        holdingId: null,
        action: "decrease",
        assetType: "stock",
        assetName: null,
        reasoning: "Your stock allocation at 40% is significantly higher than the recommended 25% for a moderate risk profile. Consider rebalancing by reducing some equity exposure and moving funds to debt or hybrid instruments.",
        suggestedAmount: "95000",
        priority: 9,
        confidence: "0.90",
        expectedReturn: null,
        riskImpact: "moderate",
        aiModel: "rudo",
        metadata: null,
        isActive: 1,
        expiresAt: null,
      }),
      storage.createRecommendation({
        portfolioId: "demo-portfolio",
        holdingId: null,
        action: "buy",
        assetType: "gold",
        assetName: "Gold ETF or Sovereign Gold Bonds",
        reasoning: "Gold allocation is well below target at just 1%. Adding gold exposure up to 10% will provide a hedge against market volatility and currency fluctuations, especially important for NRI portfolios.",
        suggestedAmount: "60000",
        priority: 7,
        confidence: "0.82",
        expectedReturn: "8.00",
        riskImpact: "low",
        aiModel: "rudo",
        metadata: null,
        isActive: 1,
        expiresAt: null,
      }),
    ]);

    // Create AA consent
    await storage.createAAConsent({
      userId: "demo-user",
      consentHandle: "CH_DEMO_123456",
      consentId: "CI_DEMO_789012",
      fiuId: "FIU_NRIWEALTH",
      status: "ACTIVE",
      consentMode: "VIEW",
      fetchType: "ONETIME",
      fiTypes: ["DEPOSIT", "MUTUAL_FUNDS", "EQUITIES"],
      purpose: "Wealth Management Portfolio Analysis",
      consentStart: new Date("2024-01-01"),
      consentExpiry: new Date("2025-01-01"),
      dataRangeFrom: new Date("2023-01-01"),
      dataRangeTo: new Date("2024-12-31"),
      frequencyUnit: "MONTH",
      frequencyValue: 1,
    });

    // Create sample mutual fund schemes for testing search
    const mutualFunds = await Promise.all([
      storage.upsertPulseLabsScheme({
        schemeCode: "INF179K01997",
        schemeName: "HDFC Equity Fund - Direct Plan - Growth",
        isin: "INF179K01997",
        amcCode: "HDFC",
        amcName: "HDFC Mutual Fund",
        category: "Equity",
        subCategory: "Large Cap",
        schemeType: "Open Ended",
        navDate: new Date().toISOString(),
        currentNav: "825.45",
        rating: 5,
        riskLevel: "High",
        metadata: { returns: { "1y": 18.5, "3y": 15.2, "5y": 14.8 } },
      }),
      storage.upsertPulseLabsScheme({
        schemeCode: "INF200K01018",
        schemeName: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
        isin: "INF200K01018",
        amcCode: "HDFC",
        amcName: "HDFC Mutual Fund",
        category: "Equity",
        subCategory: "Mid Cap",
        schemeType: "Open Ended",
        navDate: new Date().toISOString(),
        currentNav: "156.32",
        rating: 4,
        riskLevel: "Very High",
        metadata: { returns: { "1y": 22.3, "3y": 18.7, "5y": 16.2 } },
      }),
      storage.upsertPulseLabsScheme({
        schemeCode: "INF179K01039",
        schemeName: "HDFC Balanced Advantage Fund - Direct Plan - Growth",
        isin: "INF179K01039",
        amcCode: "HDFC",
        amcName: "HDFC Mutual Fund",
        category: "Hybrid",
        subCategory: "Balanced Advantage",
        schemeType: "Open Ended",
        navDate: new Date().toISOString(),
        currentNav: "378.90",
        rating: 5,
        riskLevel: "Moderate",
        metadata: { returns: { "1y": 16.8, "3y": 14.5, "5y": 13.2 } },
      }),
      storage.upsertPulseLabsScheme({
        schemeCode: "INF200K01612",
        schemeName: "SBI Bluechip Fund - Direct Plan - Growth",
        isin: "INF200K01612",
        amcCode: "SBI",
        amcName: "SBI Mutual Fund",
        category: "Equity",
        subCategory: "Large Cap",
        schemeType: "Open Ended",
        navDate: new Date().toISOString(),
        currentNav: "72.15",
        rating: 4,
        riskLevel: "High",
        metadata: { returns: { "1y": 17.2, "3y": 14.8, "5y": 13.9 } },
      }),
      storage.upsertPulseLabsScheme({
        schemeCode: "INF846K01018",
        schemeName: "Axis Long Term Equity Fund - Direct Plan - Growth",
        isin: "INF846K01018",
        amcCode: "AXIS",
        amcName: "Axis Mutual Fund",
        category: "Equity",
        subCategory: "ELSS",
        schemeType: "Open Ended",
        navDate: new Date().toISOString(),
        currentNav: "98.76",
        rating: 5,
        riskLevel: "High",
        metadata: { returns: { "1y": 19.5, "3y": 16.3, "5y": 15.7 } },
      }),
    ]);

    console.log("Demo data seeded successfully!");
    console.log("- User ID: demo-user");
    console.log("- Portfolio ID: demo-portfolio");
    console.log(`- Holdings: ${holdings.length}`);
    console.log(`- Transactions: 4`);
    console.log(`- Asset Allocations: ${allocations.length}`);
    console.log(`- Recommendations: 4`);
    console.log(`- Mutual Funds: ${mutualFunds.length}`);
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}
