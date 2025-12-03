import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Package,
  Target,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@shared/schema";
import type { EnhancedHolding } from "@shared/analyticsTypes";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";

const assetTypeLabels: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit",
  insurance: "Insurance",
  bond: "Bond",
  real_estate: "Real Estate",
  gold: "Gold",
  other: "Other",
};

const transactionTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  buy: { label: "Buy", variant: "default" },
  sell: { label: "Sell", variant: "destructive" },
  deposit: { label: "Deposit", variant: "default" },
  withdrawal: { label: "Withdrawal", variant: "destructive" },
  dividend: { label: "Dividend", variant: "secondary" },
  interest: { label: "Interest", variant: "secondary" },
  fee: { label: "Fee", variant: "outline" },
  tax: { label: "Tax", variant: "outline" },
};

export default function HoldingDetail() {
  const [, params] = useRoute("/holdings/:id");
  const holdingId = params?.id;

  const { portfolioId, isLoading: portfolioLoading } = useUserPortfolio();

  const { data: holdings, isLoading: holdingsLoading } = useQuery<EnhancedHolding[]>({
    queryKey: ['/api/portfolios', portfolioId, 'holdings'],
    enabled: !!portfolioId,
  });

  const { data: allTransactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/portfolios', portfolioId, 'transactions'],
    enabled: !!portfolioId,
  });

  const holding = holdings?.find(h => h.id === holdingId);
  const transactions = allTransactions?.filter(t => t.holdingId === holdingId)
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()) || [];

  if (portfolioLoading || holdingsLoading || transactionsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Holding Not Found</h3>
            <p className="text-muted-foreground mb-4">The requested holding could not be found.</p>
            <Link href="/holdings">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Holdings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const returns = parseFloat(holding.returns || "0");
  const returnsPercent = parseFloat(holding.returnsPercentage || "0");
  const currentValue = parseFloat(holding.currentValue);
  const investedAmount = parseFloat(holding.investedAmount);
  const quantity = parseFloat(holding.quantity);
  const averagePrice = parseFloat(holding.averagePrice);
  const currentPrice = parseFloat(holding.currentPrice);

  // Helper function to format holding period
  const formatHoldingPeriod = (daysHeld: number): string => {
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
  };

  // Helper to get tax badge variant
  const getTaxBadgeVariant = (classification: string): "default" | "secondary" | "outline" => {
    switch (classification) {
      case "LTCG":
        return "default";
      case "STCG":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/holdings">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold" data-testid="text-holding-name">{holding.assetName}</h1>
              {holding.assetSymbol && (
                <Badge variant="outline" className="text-base">
                  {holding.assetSymbol}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {assetTypeLabels[holding.assetType] || holding.assetType}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-add-transaction">
            <Activity className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-current-value">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{currentValue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{currentPrice.toFixed(2)} per unit
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-invested-amount">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invested Amount</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{investedAmount.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{averagePrice.toFixed(2)} avg price
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-returns">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns</CardTitle>
            {returns >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {returns >= 0 ? '+' : ''}₹{returns.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {returns >= 0 ? '+' : ''}{returnsPercent.toFixed(2)}% return
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-quantity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quantity.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Units held
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holding Period & Tax Information */}
      <Card data-testid="card-holding-period">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Holding Period & Tax Classification
          </CardTitle>
          <CardDescription>
            Tax efficiency insights for your investment
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Acquisition Date</p>
            <p className="text-lg font-semibold" data-testid="text-acquisition-date">
              {holding.holdingPeriod.acquisitionDate 
                ? format(new Date(holding.holdingPeriod.acquisitionDate), 'MMM dd, yyyy')
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Holding Period</p>
            <p className="text-lg font-semibold" data-testid="text-days-held">
              {formatHoldingPeriod(holding.holdingPeriod.daysHeld)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Tax Classification</p>
            <Badge 
              variant={getTaxBadgeVariant(holding.holdingPeriod.taxClassification)}
              className="text-base px-3 py-1"
              data-testid="badge-tax-classification"
            >
              {holding.holdingPeriod.taxClassification}
            </Badge>
          </div>
          {holding.holdingPeriod.monthsUntilLTCG !== null && holding.holdingPeriod.monthsUntilLTCG > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Until LTCG</p>
              <p className="text-lg font-semibold text-primary" data-testid="text-months-until-ltcg">
                {holding.holdingPeriod.monthsUntilLTCG} month{holding.holdingPeriod.monthsUntilLTCG !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} for this holding
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const typeConfig = transactionTypeLabels[transaction.transactionType] || { label: transaction.transactionType, variant: "outline" as const };
                  const isPositive = ['buy', 'deposit', 'dividend', 'interest'].includes(transaction.transactionType);
                  
                  return (
                    <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeConfig.variant}>
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{parseFloat(transaction.quantity).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(transaction.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(transaction.fees || "0").toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}₹{parseFloat(transaction.totalAmount).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{transaction.notes || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No transactions found for this holding.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost Basis</CardTitle>
            <CardDescription>Breakdown of your investment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Price per Unit</span>
              <span className="font-semibold">₹{averagePrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Units</span>
              <span className="font-semibold">{quantity.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Invested</span>
              <span className="font-semibold">₹{investedAmount.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Performance</CardTitle>
            <CardDescription>Market value and returns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Price per Unit</span>
              <span className="font-semibold">₹{currentPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Value</span>
              <span className="font-semibold">₹{currentValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Absolute Returns</span>
              <span className={`font-semibold ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {returns >= 0 ? '+' : ''}₹{returns.toLocaleString('en-IN')} ({returns >= 0 ? '+' : ''}{returnsPercent.toFixed(2)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
