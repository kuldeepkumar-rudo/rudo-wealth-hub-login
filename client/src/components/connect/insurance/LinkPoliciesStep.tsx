import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  insurer: Institution;
}

interface Policy {
  policyNumber: string;
  policyType: string;
  status: string;
  coverageAmount?: number;
  premiumAmount?: number;
}

export default function LinkPoliciesStep({ stepData, onNext, onBack }: WizardStepProps) {
  const { toast } = useToast();
  const insurer = (stepData as StepData).insurer;
  const [consentId, setConsentId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [selectedPolicies, setSelectedPolicies] = useState<Set<string>>(new Set());

  const createConsentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/account-aggregator/consent", {
        userId: "demo-user",
        institutionId: insurer.id,
        dataTypes: ["LIFE_INSURANCE", "HEALTH_INSURANCE"],
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

  const { data: policies, isLoading: isDiscovering } = useQuery<Policy[]>({
    queryKey: [`/api/account-aggregator/discover?consentId=${encodeURIComponent(consentId || "")}&otp=${encodeURIComponent(otp)}`],
    enabled: !!consentId && otp.length === 6,
  });

  const handleInitiateConsent = () => {
    createConsentMutation.mutate();
  };

  const togglePolicySelection = (policyNumber: string) => {
    const newSelected = new Set(selectedPolicies);
    if (newSelected.has(policyNumber)) {
      newSelected.delete(policyNumber);
    } else {
      newSelected.add(policyNumber);
    }
    setSelectedPolicies(newSelected);
  };

  const handleNext = () => {
    if (selectedPolicies.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one policy to link",
        variant: "destructive",
      });
      return;
    }

    const selectedPolicyData = policies?.filter((p) => selectedPolicies.has(p.policyNumber)) || [];
    
    if (selectedPolicyData.length === 0) {
      toast({
        title: "Error",
        description: "Unable to find selected policies. Please try again.",
        variant: "destructive",
      });
      return;
    }

    onNext({
      consentId,
      selectedPolicies: Array.from(selectedPolicies),
      policies: selectedPolicyData,
    });
  };

  return (
    <div className="space-y-6" data-testid="link-policies-step">
      <Card data-testid="card-selected-insurer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Selected Insurer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium" data-testid="text-insurer-name">{insurer.name}</p>
          {insurer.code && (
            <p className="text-sm text-muted-foreground" data-testid="text-insurer-code">
              Code: {insurer.code}
            </p>
          )}
        </CardContent>
      </Card>

      {!consentId && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll request access to your insurance policies through India's Account Aggregator framework.
          </p>
          <Button
            onClick={handleInitiateConsent}
            disabled={createConsentMutation.isPending}
            data-testid="button-initiate-consent"
          >
            {createConsentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initiate Policy Link
          </Button>
        </div>
      )}

      {consentId && !policies && (
        <Card data-testid="card-otp-verification">
          <CardHeader>
            <CardTitle className="text-base">Verify OTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit OTP sent to your registered mobile number
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                data-testid="input-otp"
              />
            </div>
            {isDiscovering && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Discovering your policies...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {policies && policies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span data-testid="text-policies-discovered">
              {policies.length} polic{policies.length > 1 ? "ies" : "y"} discovered
            </span>
          </div>

          <Card data-testid="card-discovered-policies">
            <CardHeader>
              <CardTitle className="text-base">Select Policies to Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {policies.map((policy, index) => (
                <div
                  key={policy.policyNumber}
                  className="flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => togglePolicySelection(policy.policyNumber)}
                  data-testid={`policy-${index}`}
                >
                  <Checkbox
                    checked={selectedPolicies.has(policy.policyNumber)}
                    onCheckedChange={() => togglePolicySelection(policy.policyNumber)}
                    data-testid={`checkbox-policy-${index}`}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm" data-testid={`text-policy-number-${index}`}>
                      {policy.policyNumber}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-policy-type-${index}`}>
                      {policy.policyType}
                    </p>
                    {(policy.coverageAmount || policy.premiumAmount) && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-policy-details-${index}`}>
                        {policy.coverageAmount && `Coverage: ₹${policy.coverageAmount.toLocaleString("en-IN")}`}
                        {policy.coverageAmount && policy.premiumAmount && " | "}
                        {policy.premiumAmount && `Premium: ₹${policy.premiumAmount.toLocaleString("en-IN")}`}
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
          disabled={selectedPolicies.size === 0 || !policies}
          data-testid="button-next"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
