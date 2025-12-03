import type { Transaction, Holding } from "@shared/schema";
import { differenceInDays, differenceInMonths } from "date-fns";

export type TaxClassification = "LTCG" | "STCG" | "N/A";

export interface HoldingPeriodInfo {
  daysHeld: number;
  acquisitionDate: Date | null;
  taxClassification: TaxClassification;
  monthsUntilLTCG: number | null;
}

/**
 * Calculate holding period from first buy transaction
 */
export function calculateHoldingPeriod(
  holding: Holding,
  transactions: Transaction[]
): HoldingPeriodInfo {
  // Filter buy transactions for this holding, sorted by date
  const buyTransactions = transactions
    .filter(t => t.holdingId === holding.id && t.transactionType === 'buy')
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  if (buyTransactions.length === 0) {
    return {
      daysHeld: 0,
      acquisitionDate: null,
      taxClassification: "N/A",
      monthsUntilLTCG: null,
    };
  }

  // First purchase date
  const acquisitionDate = new Date(buyTransactions[0].transactionDate);
  const today = new Date();
  const daysHeld = differenceInDays(today, acquisitionDate);
  const monthsHeld = differenceInMonths(today, acquisitionDate);

  // Determine tax classification based on Indian tax rules
  const taxClassification = determineTaxClassification(holding.assetType, daysHeld, monthsHeld);
  
  // Calculate months until LTCG eligibility
  const monthsUntilLTCG = calculateMonthsUntilLTCG(holding.assetType, monthsHeld, taxClassification);

  return {
    daysHeld,
    acquisitionDate,
    taxClassification,
    monthsUntilLTCG,
  };
}

/**
 * Determine tax classification based on Indian tax rules
 * 
 * Rules:
 * - Equity (stocks, mutual_fund): LTCG if held > 365 days (12 months)
 * - Debt & Others: LTCG if held > 36 months
 */
function determineTaxClassification(
  assetType: string,
  daysHeld: number,
  monthsHeld: number
): TaxClassification {
  // Equity assets (stocks, equity mutual funds)
  if (assetType === 'stock' || assetType === 'mutual_fund') {
    return daysHeld > 365 ? "LTCG" : "STCG";
  }

  // Debt and other assets (fixed deposits, bonds, gold, real estate, insurance, etc.)
  if (['fixed_deposit', 'recurring_deposit', 'bond', 'gold', 'real_estate', 'insurance', 'other'].includes(assetType)) {
    return monthsHeld > 36 ? "LTCG" : "STCG";
  }

  return "N/A";
}

/**
 * Calculate months until LTCG eligibility (if currently STCG)
 */
function calculateMonthsUntilLTCG(
  assetType: string,
  monthsHeld: number,
  currentClassification: TaxClassification
): number | null {
  // Already LTCG or N/A
  if (currentClassification !== "STCG") {
    return null;
  }

  // Equity: need 12 months total
  if (assetType === 'stock' || assetType === 'mutual_fund') {
    return Math.max(0, 12 - monthsHeld);
  }

  // Debt & Others: need 36 months total
  if (['fixed_deposit', 'recurring_deposit', 'bond', 'gold', 'real_estate', 'insurance', 'other'].includes(assetType)) {
    return Math.max(0, 36 - monthsHeld);
  }

  return null;
}

/**
 * Format holding period for display
 */
export function formatHoldingPeriod(daysHeld: number): string {
  if (daysHeld < 30) {
    return `${daysHeld} day${daysHeld !== 1 ? 's' : ''}`;
  }
  
  const months = Math.floor(daysHeld / 30);
  const years = Math.floor(months / 12);
  
  if (years > 0) {
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
    return `${years}y ${remainingMonths}m`;
  }
  
  return `${months} month${months !== 1 ? 's' : ''}`;
}

/**
 * Get tax classification badge variant for UI
 */
export function getTaxBadgeVariant(classification: TaxClassification): "default" | "secondary" | "outline" {
  switch (classification) {
    case "LTCG":
      return "default";
    case "STCG":
      return "secondary";
    default:
      return "outline";
  }
}
