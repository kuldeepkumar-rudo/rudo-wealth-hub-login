import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, TrendingUp, Activity, PieChart, Calendar, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface NavHistoryItem {
  date: string;
  nav: string | number;
}

interface FundCard {
  scheme_code: string;
  scheme_name: string;
  category?: string;
  sub_category?: string;
  amc_name?: string;
  current_nav?: string | number;
  nav_date?: string;
  returns?: Record<string, number>;
  risk_metrics?: {
    standard_deviation?: number;
    sharpe_ratio?: number;
    beta?: number;
    alpha?: number;
    volatility?: number;
  };
  holdings?: Array<{
    name: string;
    percentage?: number;
    sector?: string;
  }>;
}

interface MutualFundScheme {
  id: string;
  schemeCode: string;
  schemeName: string;
  category?: string;
  subCategory?: string;
  amcName?: string;
  currentNav?: string | number;
  navDate?: string;
  returns?: Record<string, number>;
}

export default function MutualFundDetail() {
  const [, params] = useRoute("/mutual-funds/:schemeCode");
  const schemeCode = params?.schemeCode;

  // Fetch basic scheme details (required for page to render)
  const { data: scheme, isLoading: schemeLoading, error: schemeError } = useQuery<MutualFundScheme>({
    queryKey: [`/api/mutual-funds/${schemeCode}`],
    enabled: !!schemeCode,
  });

  // Fetch NAV history (optional - don't block page render)
  const { data: navHistory } = useQuery<NavHistoryItem[]>({
    queryKey: [`/api/mutual-funds/${schemeCode}/nav-history`],
    enabled: !!schemeCode && !!scheme,
    retry: false, // Don't retry if it fails
  });

  // Fetch comprehensive fund card data (optional - don't block page render)
  const { data: fundCard } = useQuery<FundCard>({
    queryKey: [`/api/mutual-funds/${schemeCode}/fund-card`],
    enabled: !!schemeCode && !!scheme,
    retry: false, // Don't retry if it fails
  });

  // Only show loading for the required scheme data
  if (schemeLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading fund details...</p>
        </div>
      </div>
    );
  }

  if (schemeError || !scheme) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-12 text-center">
            <p className="text-sm text-destructive">Fund not found</p>
            <Link href="/mutual-funds">
              <Button variant="outline" className="mt-4" data-testid="button-back-to-search">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: string | number | undefined) => {
    if (!value) return "—";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `₹${num.toFixed(2)}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return "—";
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Prepare NAV chart data
  const chartData = navHistory?.slice(-30).map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    nav: typeof item.nav === "string" ? parseFloat(item.nav) : item.nav,
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Link href="/mutual-funds">
        <Button variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </Link>

      {/* Fund Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-fund-name">
              {scheme.schemeName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span data-testid="text-amc-name">{scheme.amcName || "—"}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs" data-testid="text-scheme-code">
            {scheme.schemeCode}
          </Badge>
        </div>

        {/* Category Badges */}
        <div className="flex flex-wrap gap-2">
          {scheme.category && (
            <Badge variant="secondary" data-testid="badge-category">
              {scheme.category}
            </Badge>
          )}
          {scheme.subCategory && (
            <Badge variant="outline" data-testid="badge-subcategory">
              {scheme.subCategory}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Current NAV</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-current-nav">
              {formatCurrency(scheme.currentNav)}
            </p>
            {scheme.navDate && (
              <p className="text-xs text-muted-foreground mt-1">
                As of {new Date(scheme.navDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {scheme.returns?.["1y"] !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">1 Year Return</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${scheme.returns["1y"] >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-1y-return">
                {formatPercentage(scheme.returns["1y"])}
              </p>
            </CardContent>
          </Card>
        )}

        {scheme.returns?.["3y"] !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">3 Year Return</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${scheme.returns["3y"] >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-3y-return">
                {formatPercentage(scheme.returns["3y"])}
              </p>
            </CardContent>
          </Card>
        )}

        {scheme.returns?.["5y"] !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">5 Year Return</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${scheme.returns["5y"] >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-5y-return">
                {formatPercentage(scheme.returns["5y"])}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="risk" data-testid="tab-risk">
            <Activity className="h-4 w-4 mr-2" />
            Risk Metrics
          </TabsTrigger>
          <TabsTrigger value="holdings" data-testid="tab-holdings">
            <PieChart className="h-4 w-4 mr-2" />
            Holdings
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                NAV History (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="nav" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No NAV history available
                </p>
              )}
            </CardContent>
          </Card>

          {/* All Returns */}
          {scheme.returns && Object.keys(scheme.returns).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historical Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {Object.entries(scheme.returns).map(([period, value]) => (
                    <div key={period} className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">{period} Return</p>
                      <p className={`text-lg font-semibold ${value >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatPercentage(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Metrics Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Analysis</CardTitle>
              <CardDescription>Statistical measures of fund performance and volatility</CardDescription>
            </CardHeader>
            <CardContent>
              {fundCard?.risk_metrics ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {fundCard.risk_metrics.standard_deviation !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Standard Deviation</p>
                      <p className="text-2xl font-bold text-primary">{fundCard.risk_metrics.standard_deviation.toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">Measure of volatility</p>
                    </div>
                  )}
                  {fundCard.risk_metrics.sharpe_ratio !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Sharpe Ratio</p>
                      <p className="text-2xl font-bold text-primary">{fundCard.risk_metrics.sharpe_ratio.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
                    </div>
                  )}
                  {fundCard.risk_metrics.beta !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Beta</p>
                      <p className="text-2xl font-bold text-primary">{fundCard.risk_metrics.beta.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Market correlation</p>
                    </div>
                  )}
                  {fundCard.risk_metrics.alpha !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Alpha</p>
                      <p className="text-2xl font-bold text-primary">{fundCard.risk_metrics.alpha.toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">Excess return</p>
                    </div>
                  )}
                  {fundCard.risk_metrics.volatility !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Volatility</p>
                      <p className="text-2xl font-bold text-primary">{fundCard.risk_metrics.volatility.toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">Price fluctuation</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Risk metrics not available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Holdings</CardTitle>
              <CardDescription>Fund's largest positions</CardDescription>
            </CardHeader>
            <CardContent>
              {fundCard?.holdings && fundCard.holdings.length > 0 ? (
                <div className="space-y-3">
                  {fundCard.holdings.slice(0, 10).map((holding, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{holding.name}</p>
                        {holding.sector && (
                          <p className="text-xs text-muted-foreground">{holding.sector}</p>
                        )}
                      </div>
                      {holding.percentage !== undefined && (
                        <Badge variant="secondary" className="ml-3">
                          {holding.percentage.toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Holdings data not available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
