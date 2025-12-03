import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { WizardStepProps } from "@/components/common/WizardContainer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Institution {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface StepData {
  broker: Institution;
}

interface DematAccount {
  accountNumber: string;
  accountType: string;
  status: string;
  dpId?: string;
  clientId?: string;
}

export default function LinkDematStep({ stepData, onNext, onBack }: WizardStepProps) {
  const { toast } = useToast();
  const broker = (stepData as StepData).broker;
  const [consentId, setConsentId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  // Create AA consent
  const createConsentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/account-aggregator/consent", {
        userId: "demo-user",
        institutionId: broker.id,
        dataTypes: ["DEMAT"],
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setConsentId(data.consentId);
      toast({
        title: "Consent Created",
        description: "Please verify the OTP sent to your registered mobile number",
      });
    },
    onError: (error: any) => {
      console.error("Consent creation failed:", error);
      toast({
        title: "Consent Failed",
        description: "Failed to create consent. Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    },
  });

  // Verify OTP and discover accounts
  const { data: accounts, isLoading: isDiscovering } = useQuery<DematAccount[]>({
    queryKey: [`/api/account-aggregator/discover?consentId=${encodeURIComponent(consentId || "")}&otp=${encodeURIComponent(otp)}`],
    enabled: !!consentId && otp.length === 6,
  });

  const handleInitiateConsent = () => {
    createConsentMutation.mutate();
  };

  const toggleAccountSelection = (accountNumber: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountNumber)) {
      newSelected.delete(accountNumber);
    } else {
      newSelected.add(accountNumber);
    }
    setSelectedAccounts(newSelected);
  };

  const handleNext = () => {
    if (selectedAccounts.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one demat account to link",
        variant: "destructive",
      });
      return;
    }

    const selectedAccountData = accounts?.filter((a) => selectedAccounts.has(a.accountNumber)) || [];
    
    if (selectedAccountData.length === 0) {
      toast({
        title: "Error",
        description: "Unable to find selected accounts. Please try again.",
        variant: "destructive",
      });
      return;
    }

    onNext({
      consentId,
      selectedAccounts: Array.from(selectedAccounts),
      accounts: selectedAccountData,
    });
  };

  return (
    <div className="space-y-6" data-testid="link-demat-step">
      <Card data-testid="card-selected-broker">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Selected Broker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium" data-testid="text-broker-name">{broker.name}</p>
          {broker.code && (
            <p className="text-sm text-muted-foreground" data-testid="text-broker-code">
              Code: {broker.code}
            </p>
          )}
        </CardContent>
      </Card>

      {!consentId && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll request access to your demat account information through India's Account Aggregator framework.
          </p>
          <Button
            onClick={handleInitiateConsent}
            disabled={createConsentMutation.isPending}
            data-testid="button-initiate-consent"
          >
            {createConsentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initiate Account Link
          </Button>
        </div>
      )}

      {consentId && !accounts && (
        <div className="space-y-4">
          <Card data-testid="card-otp-verification">
            <CardHeader>
              <CardTitle className="text-base">Verify OTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit OTP sent to your registered mobile number
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  data-testid="input-otp"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {isDiscovering && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Discovering your accounts...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span data-testid="text-accounts-discovered">
              {accounts.length} demat account{accounts.length > 1 ? "s" : ""} discovered
            </span>
          </div>

          <Card data-testid="card-discovered-accounts">
            <CardHeader>
              <CardTitle className="text-base">Select Accounts to Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.map((account, index) => (
                <div
                  key={account.accountNumber}
                  className="flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => toggleAccountSelection(account.accountNumber)}
                  data-testid={`account-${index}`}
                >
                  <Checkbox
                    checked={selectedAccounts.has(account.accountNumber)}
                    onCheckedChange={() => toggleAccountSelection(account.accountNumber)}
                    data-testid={`checkbox-account-${index}`}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm" data-testid={`text-account-number-${index}`}>
                      {account.accountNumber}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-account-type-${index}`}>
                      {account.accountType}
                    </p>
                    {account.dpId && account.clientId && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-account-details-${index}`}>
                        DP: {account.dpId} | Client: {account.clientId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} data-testid="button-back">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={selectedAccounts.size === 0 || !accounts}
          data-testid="button-next"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
