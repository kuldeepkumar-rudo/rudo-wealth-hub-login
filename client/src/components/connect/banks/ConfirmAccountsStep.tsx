import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Landmark, Building2, CheckCircle2 } from "lucide-react";
import { WizardStepProps } from "@/components/common/WizardContainer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface Institution {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface BankAccount {
  accountNumber: string;
  accountType: string;
  status: string;
  branch?: string;
  ifsc?: string;
}

interface StepData {
  bank: Institution;
  consentId: string;
  selectedAccounts: string[];
  accounts: BankAccount[];
}

export default function ConfirmAccountsStep({ stepData, onBack }: WizardStepProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { bank, consentId, accounts } = stepData as StepData;

  const linkAccountsMutation = useMutation({
    mutationFn: async () => {
      const sessionRes = await apiRequest("POST", "/api/linking-sessions", {
        userId: "demo-user",
        assetType: "BANK",
        status: "IN_PROGRESS",
      });
      const session = await sessionRes.json();

      const accountPromises = accounts.map((account) =>
        apiRequest("POST", "/api/accounts", {
          userId: "demo-user",
          assetType: "BANK",
          institutionId: bank.id,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          status: "ACTIVE",
          linkedVia: "ACCOUNT_AGGREGATOR",
          linkingSessionId: session.id,
          metadata: {
            ifsc: account.ifsc,
            branch: account.branch,
            consentId,
            bank: bank.name,
            bankCode: bank.code,
          },
        })
      );

      await Promise.all(accountPromises);

      await apiRequest("PATCH", `/api/linking-sessions/${session.id}`, {
        status: "COMPLETED",
      });

      return session;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${accounts.length} bank account${accounts.length > 1 ? "s" : ""} linked successfully`,
      });
      setLocation("/holdings");
    },
    onError: (error: any) => {
      console.error("Account linking failed:", error);
      toast({
        title: "Error",
        description: "Failed to link accounts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!accounts || accounts.length === 0) {
      toast({
        title: "Error",
        description: "No accounts to link. Please go back and select at least one account.",
        variant: "destructive",
      });
      return;
    }
    linkAccountsMutation.mutate();
  };

  return (
    <div className="space-y-6" data-testid="confirm-accounts-step">
      <Card data-testid="card-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Ready to Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium" data-testid="text-bank-name">{bank.name}</p>
              {bank.code && (
                <p className="text-sm text-muted-foreground" data-testid="text-bank-code">
                  Code: {bank.code}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Landmark className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-2">Bank Accounts</p>
              <div className="space-y-2">
                {accounts.map((account, index) => (
                  <div
                    key={account.accountNumber}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`account-summary-${index}`}
                  >
                    <div>
                      <p className="text-sm font-medium" data-testid={`text-account-number-${index}`}>
                        {account.accountNumber}
                      </p>
                      {account.ifsc && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-account-details-${index}`}>
                          IFSC: {account.ifsc}
                          {account.branch && ` | ${account.branch}`}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" data-testid={`badge-account-type-${index}`}>
                      {account.accountType}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-what-happens-next">
        <CardHeader>
          <CardTitle className="text-base">What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Your bank account{accounts.length > 1 ? "s" : ""} will be securely linked</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>We'll track your FDs, RDs, and recurring deposits</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Interest earnings and maturity schedules will be calculated</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>You can view detailed holdings in the Banks section</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={linkAccountsMutation.isPending}
          data-testid="button-back"
        >
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={linkAccountsMutation.isPending}
          data-testid="button-confirm"
        >
          {linkAccountsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm & Link
        </Button>
      </div>
    </div>
  );
}
