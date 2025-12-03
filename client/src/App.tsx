import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import { AppOnboarding } from "@/pages/AppOnboarding";
import Connect from "@/pages/Connect";
import Dashboard from "@/pages/Dashboard";
import Holdings from "@/pages/Holdings";
import HoldingDetail from "@/pages/HoldingDetail";
import Analytics from "@/pages/Analytics";
import WealthReview from "@/pages/WealthReview";
import Transactions from "@/pages/Transactions";
import RiskProfile from "@/pages/RiskProfile";
import Settings from "@/pages/Settings";
import AATest from "@/pages/AATest";
import MutualFunds from "@/pages/MutualFunds";
import MutualFundDetail from "@/pages/MutualFundDetail";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/lib/auth-context";
import { Loader2, LogOut } from "lucide-react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, status } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b flex items-center px-4 gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={status === "loggingOut"}
              data-testid="button-logout"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">
                {status === "loggingOut" ? "Logging out..." : "Logout"}
              </span>
            </Button>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto w-full space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isLoading, error, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const publicRoutes = ["/login", "/onboarding", "/connect"];
  const isPublicRoute = publicRoutes.some(route => location.startsWith(route));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Allow access to public routes regardless of auth status
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error: {(error as Error).message}</div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Standalone routes - no dashboard layout */}
      <Route path="/onboarding" component={AppOnboarding} />
      <Route path="/connect" component={Connect} />
      <Route path="/connect/:rest*" component={Connect} />
      <Route path="/login" component={Login} />

      {/* Dashboard routes - Default home page */}
      <Route path="/">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/holdings">
        {() => (
          <DashboardLayout>
            <Holdings />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/holdings/:id">
        {() => (
          <DashboardLayout>
            <HoldingDetail />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/analytics">
        {() => (
          <DashboardLayout>
            <Analytics />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/review">
        {() => (
          <DashboardLayout>
            <WealthReview />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/wealth-review">
        {() => (
          <DashboardLayout>
            <WealthReview />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/transactions">
        {() => (
          <DashboardLayout>
            <Transactions />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/risk-profile">
        {() => (
          <DashboardLayout>
            <RiskProfile />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/mutual-funds">
        {() => (
          <DashboardLayout>
            <MutualFunds />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/mutual-funds/:schemeCode">
        {() => (
          <DashboardLayout>
            <MutualFundDetail />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/aa-test">
        {() => (
          <DashboardLayout>
            <AATest />
          </DashboardLayout>
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <AuthProvider>
            <AuthWrapper>
              <Router />
            </AuthWrapper>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
