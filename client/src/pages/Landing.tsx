import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, BarChart3, Zap } from "lucide-react";

import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">NRI Wealth</span>
          </div>
          <Button
            onClick={handleLogin}
            variant="default"
            data-testid="button-login-header"
          >
            Log In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Comprehensive Wealth Management for{" "}
              <span className="text-primary">NRI Investors</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Track your entire financial portfolio across India with real-time insights,
              AI-powered recommendations, and seamless Account Aggregator integration.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button
                onClick={handleLogin}
                size="lg"
                variant="default"
                data-testid="button-login-hero"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Multi-Asset Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track mutual funds, stocks, FDs, insurance, and more in one unified dashboard.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Secure Integration</h3>
              <p className="text-sm text-muted-foreground">
                Connect your accounts securely through India's Account Aggregator framework.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">AI Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Get intelligent investment suggestions powered by AI to optimize your portfolio.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Performance Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Detailed insights into your returns, projections, and asset allocation trends.
              </p>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card className="p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to take control of your wealth?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join NRI Wealth today and experience comprehensive portfolio management
              designed specifically for Non-Resident Indian investors.
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              variant="default"
              data-testid="button-login-cta"
            >
              Start Your Journey
            </Button>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 NRI Wealth. Comprehensive wealth management for NRI investors.</p>
        </div>
      </footer>
    </div>
  );
}
