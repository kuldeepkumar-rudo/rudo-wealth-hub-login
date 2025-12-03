import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  AlertCircle,
  CheckCircle,
  Share2,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  AllocationDonut,
  PerformanceLine,
  ScenarioBandArea,
  AllocationVarianceBars,
} from "@/components/charts";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import type { AnalyticsResponse, ActionItem, AllocationBreakdown, ProjectionScenario } from "@shared/analyticsTypes";
import type { Recommendation } from "@shared/schema";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";

export default function WealthReview() {
  const { portfolioId, isLoading: portfolioLoading } = useUserPortfolio();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['/api/portfolios', portfolioId, 'analytics'],
    enabled: !!portfolioId,
  });

  const isLoading = portfolioLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground">Unable to load portfolio analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { snapshot, allocation, projections, benchmark, performanceMetrics, recommendations, actionItems } = analytics;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-wealth-review-title">
            Comprehensive Wealth Review Report
          </h1>
          <p className="text-muted-foreground mt-1">
            RuDo Digital Wealth | Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-share-report">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button data-testid="button-export-pdf">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Portfolio Snapshot */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Portfolio Snapshot</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-snapshot-value">
            <CardHeader className="pb-2">
              <CardDescription>Total Portfolio Value</CardDescription>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  ↑ +{snapshot.returnsPercentage.toFixed(1)}% from start
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ₹{snapshot.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-snapshot-invested">
            <CardHeader className="pb-2">
              <CardDescription>Total Amount Invested</CardDescription>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Initial capital invested</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₹{snapshot.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-snapshot-returns">
            <CardHeader className="pb-2">
              <CardDescription>Total Gains/Returns</CardDescription>
              <div className="flex items-center gap-2">
                {snapshot.totalReturns >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs text-muted-foreground">
                  {snapshot.returnsPercentage >= 0 ? '+' : ''}{snapshot.returnsPercentage.toFixed(1)}% overall return
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${snapshot.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {snapshot.totalReturns >= 0 ? '+' : ''}₹{snapshot.totalReturns.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-snapshot-annual-return">
            <CardHeader className="pb-2">
              <CardDescription>Average Annual Return</CardDescription>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">vs Benchmark: 10.5%</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {snapshot.returnsPercentage.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Metrics */}
      <PerformanceMetrics metrics={performanceMetrics} />

      {/* Key Insights */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Key Insights & Recommendations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">Portfolio Outperforming</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your portfolio has delivered exceptional returns of {snapshot.returnsPercentage.toFixed(1)}%,
                {snapshot.returnsPercentage > 10.5 && ` outperforming the benchmark by ${(snapshot.returnsPercentage - 10.5).toFixed(1)}% over the review period`}.
                Strong performance across asset classes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-lg">Rebalancing Recommended</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {recommendations.filter((r: Recommendation) => r.action === "sell").length} funds identified for reallocation.
                Selling underperforming funds could potentially add ₹{(projections.potentialGain / 100000).toFixed(1)}L
                to portfolio value over next 5 years.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Immediate Action Items */}
      {actionItems.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Immediate Actions Required</h2>
          <div className="space-y-4">
            {actionItems.map((item: ActionItem) => (
              <Card
                key={item.id}
                className={`${
                  item.priority === "HIGH"
                    ? "border-red-200 dark:border-red-900"
                    : item.priority === "MEDIUM"
                    ? "border-orange-200 dark:border-orange-900"
                    : "border-green-200 dark:border-green-900"
                }`}
                data-testid={`card-action-${item.priority.toLowerCase()}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          item.priority === "HIGH"
                            ? "destructive"
                            : item.priority === "MEDIUM"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {item.priority}
                      </Badge>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Affected Funds</p>
                      <p className="text-lg font-bold">{item.affectedFunds}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold">
                        ₹{(item.totalValue / 100000).toFixed(2)}L
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Timeline</p>
                      <p className="text-sm font-medium">{item.timeline}</p>
                    </div>
                    {item.potentialGain && (
                      <div>
                        <p className="text-xs text-muted-foreground">Potential Gain</p>
                        <p className="text-lg font-bold text-green-600">
                          +₹{(item.potentialGain / 100000).toFixed(2)}L over 5 years
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Performance Chart */}
      <Card data-testid="card-performance-chart">
        <CardHeader>
          <CardTitle>Portfolio Performance & Asset Allocation</CardTitle>
          <CardDescription>Portfolio growth vs benchmark over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <PerformanceLine data={benchmark} />
          </div>
        </CardContent>
      </Card>

      {/* Asset Allocation */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-allocation-chart">
          <CardHeader>
            <CardTitle>Asset Allocation Breakdown</CardTitle>
            <CardDescription>Current portfolio distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <AllocationDonut
                data={allocation}
                onSegmentClick={(assetType) => console.log('Clicked:', assetType)}
              />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-allocation-variance">
          <CardHeader>
            <CardTitle>Current vs Recommended Allocation</CardTitle>
            <CardDescription>Rebalancing opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <AllocationVarianceBars
                data={allocation}
                onBarClick={(assetType) => console.log('Clicked:', assetType)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5-Year Projections */}
      <Card data-testid="card-projections">
        <CardHeader>
          <CardTitle>5-Year Projected Returns (Scenario Analysis)</CardTitle>
          <CardDescription>
            Projections based on historical performance, market conditions, and fund manager track records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-96">
            <ScenarioBandArea
              currentValue={snapshot.totalValue}
              scenarios={projections.currentAllocation}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            {projections.currentAllocation.map((scenario: ProjectionScenario) => (
              <div key={scenario.scenarioType} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{scenario.scenarioType} Case</span>
                  <Badge variant={scenario.scenarioType === "best" ? "default" : "secondary"}>
                    {scenario.avgAnnualReturn.toFixed(1)}% annually
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  ₹{(scenario.projectedValue / 100000).toFixed(1)}L
                </div>
                <div className="text-sm text-muted-foreground">
                  {scenario.totalReturn.toFixed(0)}% Total Return
                </div>
              </div>
            ))}
          </div>

          {projections.potentialGain > 0 && (
            <>
              <Separator />
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Potential Gain from Recommended Actions
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      +₹{(projections.potentialGain / 100000).toFixed(2)}L over 5 years
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Based on implementing sell/reallocation recommendations
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Allocation Details Table */}
      <Card data-testid="card-allocation-details">
        <CardHeader>
          <CardTitle>Current Portfolio Allocation Breakdown</CardTitle>
          <CardDescription>Detailed view of your investments by asset class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-semibold">Asset Type</th>
                  <th className="text-right py-3 px-2 font-semibold">Investment</th>
                  <th className="text-right py-3 px-2 font-semibold">Current Value</th>
                  <th className="text-right py-3 px-2 font-semibold">Allocation %</th>
                  <th className="text-right py-3 px-2 font-semibold">Return %</th>
                </tr>
              </thead>
              <tbody>
                {allocation.map((item: AllocationBreakdown, index: number) => (
                  <tr key={index} className="border-b hover-elevate" data-testid={`row-allocation-${index}`}>
                    <td className="py-3 px-2 font-medium capitalize">
                      {item.assetType.replace('_', ' ')}
                    </td>
                    <td className="text-right py-3 px-2">
                      ₹{item.investment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      ₹{item.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="text-right py-3 px-2">
                      {item.currentAllocation.toFixed(1)}%
                    </td>
                    <td className={`text-right py-3 px-2 font-medium ${item.returnsPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.returnsPercentage >= 0 ? '+' : ''}{item.returnsPercentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2">
                  <td className="py-3 px-2">TOTAL</td>
                  <td className="text-right py-3 px-2">
                    ₹{allocation.reduce((sum: number, item: AllocationBreakdown) => sum + item.investment, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="text-right py-3 px-2">
                    ₹{allocation.reduce((sum: number, item: AllocationBreakdown) => sum + item.currentValue, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="text-right py-3 px-2">100.0%</td>
                  <td className={`text-right py-3 px-2 ${snapshot.returnsPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {snapshot.returnsPercentage >= 0 ? '+' : ''}{snapshot.returnsPercentage.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This report has been prepared by RuDo Digital Wealth Pvt Ltd for your exclusive use. The information contained herein is confidential and proprietary.
          </p>
          <p>
            The recommendations and projections provided are based on current market conditions, historical data, and our professional analysis. Past performance is not indicative of future results. Investment values may fall as well as rise.
          </p>
          <p>
            This report does not constitute an offer, solicitation, or recommendation to buy or sell any securities. All investment decisions should be made in consultation with your financial advisor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
