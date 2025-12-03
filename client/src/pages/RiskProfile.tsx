import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Shield, TrendingUp, Calendar, Users, Target } from "lucide-react";
import { format } from "date-fns";
import type { RiskProfile } from "@shared/schema";

const riskLevelConfig: Record<string, { label: string; color: string; description: string }> = {
  very_low: { 
    label: "Very Low Risk", 
    color: "text-green-600 bg-green-100 dark:bg-green-900/20",
    description: "Conservative investor preferring capital preservation"
  },
  low: { 
    label: "Low Risk", 
    color: "text-green-500 bg-green-100 dark:bg-green-900/20",
    description: "Cautious investor with focus on stability"
  },
  moderate: { 
    label: "Moderate Risk", 
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20",
    description: "Balanced approach to risk and returns"
  },
  high: { 
    label: "High Risk", 
    color: "text-orange-600 bg-orange-100 dark:bg-orange-900/20",
    description: "Aggressive investor seeking higher returns"
  },
  very_high: { 
    label: "Very High Risk", 
    color: "text-red-600 bg-red-100 dark:bg-red-900/20",
    description: "Highly aggressive with high risk tolerance"
  },
};

export default function RiskProfile() {
  const { data: profile, isLoading } = useQuery<RiskProfile>({
    queryKey: ['/api/users/demo-user/risk-profile'],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No Risk Profile Found</h3>
                <p className="text-muted-foreground mt-2">
                  Complete your risk assessment to get personalized investment recommendations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskConfig = riskLevelConfig[profile.riskLevel];
  const monthlyIncome = profile.monthlyIncome ? parseFloat(profile.monthlyIncome) : 0;
  const monthlyExpenses = profile.monthlyExpenses ? parseFloat(profile.monthlyExpenses) : 0;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-risk-profile-title">Risk Profile</h1>
        <p className="text-muted-foreground">Your investment risk assessment and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>
              Last updated: {format(new Date(profile.assessmentDate), 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Risk Level</span>
                <Badge className={riskConfig.color}>
                  {riskConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{riskConfig.description}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Risk Score</span>
                <span className="text-2xl font-bold">{profile.riskScore}/100</span>
              </div>
              <Progress value={profile.riskScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {profile.riskScore < 20 ? 'Very Conservative' : 
                 profile.riskScore < 40 ? 'Conservative' : 
                 profile.riskScore < 60 ? 'Balanced' : 
                 profile.riskScore < 80 ? 'Aggressive' : 'Very Aggressive'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Investment Horizon</p>
                <p className="text-sm text-muted-foreground">
                  {profile.investmentHorizon} months ({Math.floor(profile.investmentHorizon / 12)} years)
                </p>
              </div>
            </div>

            {profile.dependents !== null && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dependents</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.dependents} {profile.dependents === 1 ? 'person' : 'people'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Monthly income and expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {monthlyIncome > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Monthly Income</span>
                  <span className="text-lg font-bold">
                    ₹{monthlyIncome.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {monthlyExpenses > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Monthly Expenses</span>
                  <span className="text-lg font-bold">
                    ₹{monthlyExpenses.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {monthlyIncome > 0 && monthlyExpenses > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Savings Rate</span>
                  <span className="text-lg font-bold text-green-600">
                    {savingsRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={savingsRate} className="h-2 [&>div]:bg-green-600" />
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{(monthlyIncome - monthlyExpenses).toLocaleString('en-IN')} available for investment
                </p>
              </div>
            )}

            {profile.investmentGoals && profile.investmentGoals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Investment Goals</span>
                </div>
                <div className="space-y-2">
                  {profile.investmentGoals.map((goal, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Asset Allocation</CardTitle>
          <CardDescription>Based on your risk profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {profile.riskLevel === 'very_low' && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Fixed Deposits</span>
                    <span className="font-semibold">40%</span>
                  </div>
                  <Progress value={40} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Bonds</span>
                    <span className="font-semibold">30%</span>
                  </div>
                  <Progress value={30} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Debt Funds</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <Progress value={20} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Stocks</span>
                    <span className="font-semibold">10%</span>
                  </div>
                  <Progress value={10} />
                </div>
              </>
            )}
            {profile.riskLevel === 'low' && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Debt Funds</span>
                    <span className="font-semibold">35%</span>
                  </div>
                  <Progress value={35} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Fixed Deposits</span>
                    <span className="font-semibold">30%</span>
                  </div>
                  <Progress value={30} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Balanced Funds</span>
                    <span className="font-semibold">20%</span>
                  </div>
                  <Progress value={20} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Stocks</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <Progress value={15} />
                </div>
              </>
            )}
            {profile.riskLevel === 'moderate' && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Equity Funds</span>
                    <span className="font-semibold">35%</span>
                  </div>
                  <Progress value={35} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Debt Funds</span>
                    <span className="font-semibold">30%</span>
                  </div>
                  <Progress value={30} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Stocks</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <Progress value={25} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Gold/Other</span>
                    <span className="font-semibold">10%</span>
                  </div>
                  <Progress value={10} />
                </div>
              </>
            )}
            {['high', 'very_high'].includes(profile.riskLevel) && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Stocks</span>
                    <span className="font-semibold">{profile.riskLevel === 'very_high' ? '50%' : '40%'}</span>
                  </div>
                  <Progress value={profile.riskLevel === 'very_high' ? 50 : 40} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Equity Funds</span>
                    <span className="font-semibold">{profile.riskLevel === 'very_high' ? '30%' : '35%'}</span>
                  </div>
                  <Progress value={profile.riskLevel === 'very_high' ? 30 : 35} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Debt Funds</span>
                    <span className="font-semibold">{profile.riskLevel === 'very_high' ? '15%' : '20%'}</span>
                  </div>
                  <Progress value={profile.riskLevel === 'very_high' ? 15 : 20} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Alternative</span>
                    <span className="font-semibold">5%</span>
                  </div>
                  <Progress value={5} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
