import { Route, Switch, useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Landmark, Shield, ArrowLeft } from "lucide-react";
import WizardContainer, { WizardStep, WizardStepProps } from "@/components/common/WizardContainer";
import SearchAMCStep from "@/components/connect/mutual-funds/SearchAMCStep";
import LinkFoliosStep from "@/components/connect/mutual-funds/LinkFoliosStep";
import ConfirmFoliosStep from "@/components/connect/mutual-funds/ConfirmFoliosStep";
import SearchBrokerStep from "@/components/connect/stocks/SearchBrokerStep";
import LinkDematStep from "@/components/connect/stocks/LinkDematStep";
import ConfirmHoldingsStep from "@/components/connect/stocks/ConfirmHoldingsStep";
import SearchBankStep from "@/components/connect/banks/SearchBankStep";
import LinkAccountsStep from "@/components/connect/banks/LinkAccountsStep";
import ConfirmAccountsStep from "@/components/connect/banks/ConfirmAccountsStep";
import SearchInsurerStep from "@/components/connect/insurance/SearchInsurerStep";
import LinkPoliciesStep from "@/components/connect/insurance/LinkPoliciesStep";
import ConfirmPoliciesStep from "@/components/connect/insurance/ConfirmPoliciesStep";

// Placeholder step components for Stock, Bank, Insurance - will be enhanced in tasks 9-11
function SelectInstitutionStep({ onNext }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        This step will allow users to search and select financial institutions.
      </p>
      <Button onClick={() => onNext({ institutionId: "placeholder" })} data-testid="button-next-step">
        Continue
      </Button>
    </div>
  );
}

function LinkAccountStep({ onNext }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        This step will handle account linking via Account Aggregator.
      </p>
      <Button onClick={() => onNext({ accountId: "placeholder" })} data-testid="button-next-step">
        Continue
      </Button>
    </div>
  );
}

function ConfirmationStep({ onNext, stepData }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Review and confirm your linked accounts.</p>
      <div className="text-sm text-muted-foreground">
        <pre>{JSON.stringify(stepData, null, 2)}</pre>
      </div>
      <Button onClick={() => onNext()} data-testid="button-complete">
        Complete
      </Button>
    </div>
  );
}

// Mutual Fund flow - 3 steps with real implementations
function MutualFundFlow() {
  const [, setLocation] = useLocation();

  const steps: WizardStep[] = [
    {
      id: "select-amc",
      title: "Select AMC",
      subtitle: "Search and select your Asset Management Company",
      component: SearchAMCStep,
    },
    {
      id: "link-folios",
      title: "Link Folios",
      subtitle: "Connect your mutual fund folios via Account Aggregator",
      component: LinkFoliosStep,
    },
    {
      id: "confirm",
      title: "Confirm",
      subtitle: "Review your linked mutual fund accounts",
      component: ConfirmFoliosStep,
    },
  ];

  const handleComplete = (data: Record<string, any>) => {
    console.log("Mutual Fund linking completed:", data);
    setLocation("/holdings");
  };

  return (
    <WizardContainer
      steps={steps}
      onComplete={handleComplete}
      testId="mutual-fund-wizard"
    />
  );
}

// Stock/Demat flow - 3 steps with real implementations
function StockFlow() {
  const [, setLocation] = useLocation();

  const steps: WizardStep[] = [
    {
      id: "select-broker",
      title: "Select Broker",
      subtitle: "Search and select your stock broker or depository",
      component: SearchBrokerStep,
    },
    {
      id: "link-demat",
      title: "Link Demat Account",
      subtitle: "Connect your demat account via Account Aggregator",
      component: LinkDematStep,
    },
    {
      id: "confirm",
      title: "Confirm",
      subtitle: "Review your linked stock holdings",
      component: ConfirmHoldingsStep,
    },
  ];

  const handleComplete = (data: Record<string, any>) => {
    console.log("Stock linking completed:", data);
    setLocation("/holdings");
  };

  return <WizardContainer steps={steps} onComplete={handleComplete} testId="stock-wizard" />;
}

// Bank flow - 3 steps with real implementations
function BankFlow() {
  const [, setLocation] = useLocation();

  const steps: WizardStep[] = [
    {
      id: "select-bank",
      title: "Select Bank",
      subtitle: "Search and select your bank",
      component: SearchBankStep,
    },
    {
      id: "link-accounts",
      title: "Link Accounts",
      subtitle: "Connect your bank accounts, FDs, and RDs",
      component: LinkAccountsStep,
    },
    {
      id: "confirm",
      title: "Confirm",
      subtitle: "Review your linked bank accounts",
      component: ConfirmAccountsStep,
    },
  ];

  const handleComplete = (data: Record<string, any>) => {
    console.log("Bank linking completed:", data);
    setLocation("/holdings");
  };

  return <WizardContainer steps={steps} onComplete={handleComplete} testId="bank-wizard" />;
}

// Insurance flow - 3 steps with real implementations
function InsuranceFlow() {
  const [, setLocation] = useLocation();

  const steps: WizardStep[] = [
    {
      id: "select-insurer",
      title: "Select Insurer",
      subtitle: "Search and select your insurance provider",
      component: SearchInsurerStep,
    },
    {
      id: "link-policies",
      title: "Link Policies",
      subtitle: "Connect your life and health insurance policies",
      component: LinkPoliciesStep,
    },
    {
      id: "confirm",
      title: "Confirm",
      subtitle: "Review your linked insurance policies",
      component: ConfirmPoliciesStep,
    },
  ];

  const handleComplete = (data: Record<string, any>) => {
    console.log("Insurance linking completed:", data);
    setLocation("/holdings");
  };

  return <WizardContainer steps={steps} onComplete={handleComplete} testId="insurance-wizard" />;
}

interface AssetTypeConfig {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  color: string;
  route: string;
}

const ASSET_TYPES: AssetTypeConfig[] = [
  {
    id: "mutual-funds",
    title: "Mutual Funds",
    description: "Link AMC folios via Account Aggregator",
    icon: TrendingUp,
    color: "text-blue-500 dark:text-blue-400",
    route: "/connect/mutual-funds",
  },
  {
    id: "stocks",
    title: "Stocks & Demat",
    description: "Connect broker accounts and holdings",
    icon: Building2,
    color: "text-purple-500 dark:text-purple-400",
    route: "/connect/stocks",
  },
  {
    id: "banks",
    title: "Bank Accounts",
    description: "Link savings, FDs, and RDs",
    icon: Landmark,
    color: "text-green-500 dark:text-green-400",
    route: "/connect/banks",
  },
  {
    id: "insurance",
    title: "Insurance",
    description: "Add life and health policies",
    icon: Shield,
    color: "text-orange-500 dark:text-orange-400",
    route: "/connect/insurance",
  },
];

function AssetTypeSelector() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="text-connect-title">
            Connect Your Assets
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-connect-subtitle">
            Link your financial accounts using India's Account Aggregator framework
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ASSET_TYPES.map((assetType) => {
            const Icon = assetType.icon;
            return (
              <Card
                key={assetType.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation(assetType.route)}
                data-testid={`card-asset-type-${assetType.id}`}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-md bg-muted ${assetType.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-lg" data-testid={`text-asset-type-title-${assetType.id}`}>
                        {assetType.title}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-asset-type-desc-${assetType.id}`}>
                        {assetType.description}
                      </p>
                    </div>
                  </div>
                  <Button className="w-full" data-testid={`button-connect-${assetType.id}`}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Connect() {
  return (
    <Switch>
      <Route path="/connect" component={AssetTypeSelector} />
      <Route path="/connect/mutual-funds" component={MutualFundFlow} />
      <Route path="/connect/stocks" component={StockFlow} />
      <Route path="/connect/banks" component={BankFlow} />
      <Route path="/connect/insurance" component={InsuranceFlow} />
    </Switch>
  );
}
