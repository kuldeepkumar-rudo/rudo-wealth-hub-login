import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingDown, Target } from "lucide-react";
import type { PerformanceMetrics as PerformanceMetricsType } from "@shared/analyticsTypes";

interface PerformanceMetricsProps {
  metrics: PerformanceMetricsType;
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  // Helper to get Sharpe ratio interpretation
  const getSharpeRatioInterpretation = (sharpeRatio: number): {
    label: string;
    variant: "default" | "secondary" | "destructive";
  } => {
    if (sharpeRatio >= 2) {
      return { label: "Excellent", variant: "default" };
    } else if (sharpeRatio >= 1) {
      return { label: "Good", variant: "default" };
    } else if (sharpeRatio >= 0) {
      return { label: "Acceptable", variant: "secondary" };
    } else {
      return { label: "Poor", variant: "destructive" };
    }
  };

  // Helper to get volatility risk level
  const getVolatilityRiskLevel = (volatility: number): {
    label: string;
    variant: "default" | "secondary" | "destructive";
  } => {
    if (volatility < 10) {
      return { label: "Low Risk", variant: "default" };
    } else if (volatility < 20) {
      return { label: "Moderate Risk", variant: "secondary" };
    } else if (volatility < 30) {
      return { label: "High Risk", variant: "destructive" };
    } else {
      return { label: "Very High Risk", variant: "destructive" };
    }
  };

  const sharpeInterpretation = getSharpeRatioInterpretation(metrics.sharpeRatio);
  const volatilityRisk = getVolatilityRiskLevel(metrics.volatility);

  return (
    <Card data-testid="card-performance-metrics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Advanced Performance Metrics
        </CardTitle>
        <CardDescription>
          Risk-adjusted performance analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        {/* Volatility */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Volatility (σ)</p>
            <Badge variant={volatilityRisk.variant} data-testid="badge-volatility-risk">
              {volatilityRisk.label}
            </Badge>
          </div>
          <p className="text-3xl font-bold" data-testid="text-volatility">
            {metrics.volatility.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground">
            Annualized standard deviation
          </p>
        </div>

        {/* Sharpe Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
            <Badge variant={sharpeInterpretation.variant} data-testid="badge-sharpe-interpretation">
              {sharpeInterpretation.label}
            </Badge>
          </div>
          <p className="text-3xl font-bold" data-testid="text-sharpe-ratio">
            {metrics.sharpeRatio.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            Risk-adjusted return
          </p>
        </div>

        {/* Max Drawdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-3xl font-bold text-destructive" data-testid="text-max-drawdown">
            -{metrics.maxDrawdown.toFixed(2)}%
          </p>
          {metrics.maxDrawdownPeriod && (
            <p className="text-xs text-muted-foreground" data-testid="text-drawdown-period">
              {metrics.maxDrawdownPeriod.start} to {metrics.maxDrawdownPeriod.end}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
