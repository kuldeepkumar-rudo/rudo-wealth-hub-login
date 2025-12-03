import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Activity, LogIn, Link as LinkIcon, Plus, Lightbulb } from "lucide-react";
import { useUserPortfolio } from "@/hooks/useUserPortfolio";

export default function Dashboard() {
  const { portfolios, isLoading, user } = useUserPortfolio();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const totalValue = portfolios?.reduce((sum, p) => sum + parseFloat(p.totalValue || "0"), 0) || 0;
  const totalInvested = portfolios?.reduce((sum, p) => sum + parseFloat(p.totalInvested || "0"), 0) || 0;
  const totalReturns = totalValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
            {user ? `Welcome, ${user.firstName || 'Investor'}` : 'Portfolio Overview'}
          </h1>
          <p className="text-muted-foreground">Track your investments across all asset classes</p>
        </div>
        <Link href="/onboarding">
          <Button variant="outline" data-testid="button-view-onboarding">
            <LogIn className="mr-2 h-4 w-4" />
            View Onboarding Flow
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-value">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {portfolios?.length || 0} portfolio{portfolios?.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-invested">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invested">
              ₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Principal amount</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-returns">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            {totalReturns >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-returns">
              {totalReturns >= 0 ? '+' : ''}₹{totalReturns.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {returnsPercentage >= 0 ? '+' : ''}{returnsPercentage.toFixed(2)}% overall
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-returns-percentage">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns %</CardTitle>
            <Badge variant={returnsPercentage >= 0 ? "default" : "destructive"}>
              {returnsPercentage >= 0 ? '+' : ''}{returnsPercentage.toFixed(2)}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Performance</div>
            <p className="text-xs text-muted-foreground">
              {returnsPercentage >= 10 ? 'Excellent' : returnsPercentage >= 5 ? 'Good' : returnsPercentage >= 0 ? 'Moderate' : 'Below expectations'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Portfolios</CardTitle>
            <CardDescription>Manage your investment portfolios</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolios && portfolios.length > 0 ? (
              <div className="space-y-4">
                {portfolios.map((portfolio) => {
                  const returns = parseFloat(portfolio.totalReturns || "0");
                  const returnsPercent = parseFloat(portfolio.returnsPercentage || "0");
                  
                  return (
                    <Link key={portfolio.id} href="/holdings">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-portfolio-${portfolio.id}`}>
                        <div>
                          <h3 className="font-semibold">{portfolio.name}</h3>
                          <p className="text-sm text-muted-foreground">{portfolio.description || 'No description'}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{parseFloat(portfolio.totalValue || "0").toLocaleString('en-IN')}</div>
                          <div className={`text-sm ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {returns >= 0 ? '+' : ''}{returnsPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No portfolios found. Link your accounts to get started!</p>
                <Link href="/connect">
                  <Button className="mt-4" data-testid="button-create-portfolio">
                    <Plus className="mr-2 h-4 w-4" />
                    Link Accounts
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/connect">
              <div className="p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer" data-testid="button-link-aa">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">Link Bank Account</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Connect via Account Aggregator</p>
              </div>
            </Link>
            <Link href="/transactions">
              <div className="p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer" data-testid="button-add-transaction">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">View Transactions</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">See all your investment activity</p>
              </div>
            </Link>
            <Link href="/analytics">
              <div className="p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer" data-testid="button-view-recommendations">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">View Recommendations</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">AI-powered portfolio insights</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
