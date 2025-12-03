import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  PieChart, 
  BarChart3,
  Target,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import AllocationDonut from "@/components/charts/AllocationDonut";
import type { AssetAllocation, Recommendation } from "@shared/schema";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";

const assetTypeLabels: Record<string, string> = {
  mutual_fund: "Mutual Funds",
  stock: "Stocks",
  fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits",
  insurance: "Insurance",
  bond: "Bonds",
  real_estate: "Real Estate",
  gold: "Gold",
  other: "Other",
};

const actionLabels: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; icon: any }> = {
  buy: { label: "Buy", variant: "default", icon: TrendingUp },
  sell: { label: "Sell", variant: "destructive", icon: TrendingDown },
  hold: { label: "Hold", variant: "secondary", icon: Target },
  increase: { label: "Increase", variant: "default", icon: TrendingUp },
  decrease: { label: "Decrease", variant: "outline", icon: TrendingDown },
};

type ViewMode = 'chart' | 'breakdown';

export default function Analytics() {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(null);
  const { toast } = useToast();

  const { portfolioId, isLoading: portfolioLoading } = useUserPortfolio();

  const { data: allocations, isLoading: allocationsLoading } = useQuery<AssetAllocation[]>({
    queryKey: ['/api/portfolios', portfolioId, 'asset-allocations'],
    enabled: !!portfolioId,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendation[]>({
    queryKey: ['/api/portfolios', portfolioId, 'recommendations', 'active'],
    enabled: !!portfolioId,
  });

  const acceptMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      if (!portfolioId) throw new Error("Portfolio not loaded");
      return apiRequest('POST', `/api/recommendations/${recommendationId}/accept`);
    },
    onSuccess: () => {
      if (portfolioId) {
        queryClient.invalidateQueries({ queryKey: ['/api/portfolios', portfolioId, 'recommendations', 'active'] });
      }
      toast({
        title: "Recommendation Accepted",
        description: "This recommendation has been marked as accepted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept recommendation.",
        variant: "destructive",
      });
    },
  });

  const deferMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      if (!portfolioId) throw new Error("Portfolio not loaded");
      return apiRequest('POST', `/api/recommendations/${recommendationId}/defer`);
    },
    onSuccess: () => {
      if (portfolioId) {
        queryClient.invalidateQueries({ queryKey: ['/api/portfolios', portfolioId, 'recommendations', 'active'] });
      }
      toast({
        title: "Recommendation Deferred",
        description: "This recommendation has been deferred for later review.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to defer recommendation.",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      if (!portfolioId) throw new Error("Portfolio not loaded");
      return apiRequest('POST', `/api/recommendations/${recommendationId}/dismiss`);
    },
    onSuccess: () => {
      if (portfolioId) {
        queryClient.invalidateQueries({ queryKey: ['/api/portfolios', portfolioId, 'recommendations', 'active'] });
      }
      toast({
        title: "Recommendation Dismissed",
        description: "This recommendation will no longer be shown.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss recommendation.",
        variant: "destructive",
      });
    },
  });

  if (portfolioLoading || allocationsLoading || recommendationsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const totalValue = allocations?.reduce((sum, a) => sum + parseFloat(a.currentValue), 0) || 0;
  const needsRebalancing = allocations?.some(a => Math.abs(parseFloat(a.deviation || "0")) > 5) || false;

  const handleSegmentClick = (assetType: string) => {
    setSelectedAssetType(assetType === selectedAssetType ? null : assetType);
  };

  const chartData = allocations?.map(a => ({
    assetType: a.assetType,
    currentValue: parseFloat(a.currentValue),
    currentAllocation: parseFloat(a.currentAllocation),
  })) || [];

  const filteredAllocations = selectedAssetType 
    ? allocations?.filter(a => a.assetType === selectedAssetType)
    : allocations;

  // Global pending state for all recommendation actions
  const isAnyActionPending = acceptMutation.isPending || deferMutation.isPending || dismissMutation.isPending;
  const isActionsDisabled = isAnyActionPending || !portfolioId;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics & Insights</h1>
          <p className="text-muted-foreground">AI-powered portfolio analysis and recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          {needsRebalancing && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Rebalancing Needed
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-allocated">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {allocations?.length || 0} asset classes
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-recommendations">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recommendations</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recommendations?.filter(r => (r.priority || 0) >= 8).length || 0} high priority
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-portfolio-balance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Balance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {needsRebalancing ? (
                <span className="text-yellow-600">Needs Attention</span>
              ) : (
                <span className="text-green-600">Balanced</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {needsRebalancing ? 'Some assets need rebalancing' : 'All assets within targets'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Current portfolio distribution</CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'chart' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('chart')}
                  data-testid="button-view-chart"
                >
                  <PieChart className="h-4 w-4 mr-1" />
                  Chart
                </Button>
                <Button
                  variant={viewMode === 'breakdown' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('breakdown')}
                  data-testid="button-view-breakdown"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Breakdown
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'chart' && allocations && allocations.length > 0 ? (
              <div className="h-80">
                <AllocationDonut 
                  data={chartData}
                  onSegmentClick={handleSegmentClick}
                />
                {selectedAssetType && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      Selected: {assetTypeLabels[selectedAssetType]}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSelectedAssetType(null)}
                      className="p-0 h-auto"
                    >
                      Clear selection
                    </Button>
                  </div>
                )}
              </div>
            ) : viewMode === 'breakdown' && filteredAllocations && filteredAllocations.length > 0 ? (
              <div className="space-y-4">
                {filteredAllocations.map((allocation) => {
                  const current = parseFloat(allocation.currentAllocation);
                  const recommended = parseFloat(allocation.recommendedAllocation || "0");
                  const deviation = parseFloat(allocation.deviation || "0");
                  const needsRebalancing = Math.abs(deviation) > 5;

                  return (
                    <div key={allocation.id} className="space-y-2" data-testid={`allocation-${allocation.assetType}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{assetTypeLabels[allocation.assetType] || allocation.assetType}</span>
                          {needsRebalancing && (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {current.toFixed(1)}% {recommended > 0 && `/ ${recommended.toFixed(1)}%`}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Progress value={current} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">Current</p>
                          </div>
                          {recommended > 0 && (
                            <div className="flex-1">
                              <Progress value={recommended} className="h-2 [&>div]:bg-green-600" />
                              <p className="text-xs text-muted-foreground mt-1">Recommended</p>
                            </div>
                          )}
                        </div>
                        {recommended > 0 && deviation !== 0 && (
                          <p className={`text-xs ${deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {deviation > 0 ? `+${deviation.toFixed(1)}%` : `${deviation.toFixed(1)}%`} from target
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        ₹{parseFloat(allocation.currentValue).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No asset allocation data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Powered by RuDo portfolio analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations && recommendations.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recommendations
                  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                  .map((rec) => {
                    const actionConfig = actionLabels[rec.action];
                    const ActionIcon = actionConfig.icon;
                    const hasReturn = rec.expectedReturn && parseFloat(rec.expectedReturn) !== 0;
                    const isHighPriority = rec.priority && rec.priority >= 8;
                    
                    return (
                      <div 
                        key={rec.id} 
                        className={`p-4 rounded-lg border space-y-3 hover-elevate ${isHighPriority ? 'border-yellow-600/50 bg-yellow-50/5' : ''}`}
                        data-testid={`recommendation-${rec.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant={actionConfig.variant} className="gap-1">
                                <ActionIcon className="h-3 w-3" />
                                {actionConfig.label}
                              </Badge>
                              {rec.assetName && (
                                <span className="font-semibold text-sm">{rec.assetName}</span>
                              )}
                              {isHighPriority && (
                                <Badge variant="destructive" className="text-xs">
                                  High Priority
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          {rec.suggestedAmount && (
                            <div>
                              <span className="text-muted-foreground">Amount: </span>
                              <span className="font-semibold">
                                ₹{parseFloat(rec.suggestedAmount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                          {hasReturn && (
                            <div className={parseFloat(rec.expectedReturn!) > 0 ? 'text-green-600' : 'text-red-600'}>
                              {parseFloat(rec.expectedReturn!) > 0 ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                              <span className="font-semibold">
                                {parseFloat(rec.expectedReturn!).toFixed(2)}% expected
                              </span>
                            </div>
                          )}
                          {rec.confidence && (
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className="font-semibold">
                                {(parseFloat(rec.confidence) * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            data-testid={`button-accept-${rec.id}`}
                            onClick={() => acceptMutation.mutate(rec.id)}
                            disabled={isActionsDisabled}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            data-testid={`button-defer-${rec.id}`}
                            onClick={() => deferMutation.mutate(rec.id)}
                            disabled={isActionsDisabled}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Defer
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            data-testid={`button-dismiss-${rec.id}`}
                            onClick={() => dismissMutation.mutate(rec.id)}
                            disabled={isActionsDisabled}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active recommendations at this time</p>
                <p className="text-sm mt-2">Check back later for AI-powered insights</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
