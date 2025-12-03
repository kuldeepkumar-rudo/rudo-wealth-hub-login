import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Building2, CheckCircle2 } from "lucide-react";
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

interface Policy {
  policyNumber: string;
  policyType: string;
  status: string;
  coverageAmount?: number;
  premiumAmount?: number;
}

interface StepData {
  insurer: Institution;
  consentId: string;
  selectedPolicies: string[];
  policies: Policy[];
}

export default function ConfirmPoliciesStep({ stepData, onBack }: WizardStepProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { insurer, consentId, policies } = stepData as StepData;

  const linkPoliciesMutation = useMutation({
    mutationFn: async () => {
      const sessionRes = await apiRequest("POST", "/api/linking-sessions", {
        userId: "demo-user",
        assetType: "INSURANCE",
        status: "IN_PROGRESS",
      });
      const session = await sessionRes.json();

      const policyPromises = policies.map((policy) =>
        apiRequest("POST", "/api/accounts", {
          userId: "demo-user",
          assetType: "INSURANCE",
          institutionId: insurer.id,
          accountNumber: policy.policyNumber,
          accountType: policy.policyType,
          status: "ACTIVE",
          linkedVia: "ACCOUNT_AGGREGATOR",
          linkingSessionId: session.id,
          metadata: {
            coverageAmount: policy.coverageAmount,
            premiumAmount: policy.premiumAmount,
            consentId,
            insurer: insurer.name,
            insurerCode: insurer.code,
          },
        })
      );

      await Promise.all(policyPromises);

      await apiRequest("PATCH", `/api/linking-sessions/${session.id}`, {
        status: "COMPLETED",
      });

      return session;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${policies.length} insurance polic${policies.length > 1 ? "ies" : "y"} linked successfully`,
      });
      setLocation("/holdings");
    },
    onError: (error: any) => {
      console.error("Policy linking failed:", error);
      toast({
        title: "Error",
        description: "Failed to link policies. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!policies || policies.length === 0) {
      toast({
        title: "Error",
        description: "No policies to link. Please go back and select at least one policy.",
        variant: "destructive",
      });
      return;
    }
    linkPoliciesMutation.mutate();
  };

  return (
    <div className="space-y-6" data-testid="confirm-policies-step">
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
              <p className="font-medium" data-testid="text-insurer-name">{insurer.name}</p>
              {insurer.code && (
                <p className="text-sm text-muted-foreground" data-testid="text-insurer-code">
                  Code: {insurer.code}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-2">Insurance Policies</p>
              <div className="space-y-2">
                {policies.map((policy, index) => (
                  <div
                    key={policy.policyNumber}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`policy-summary-${index}`}
                  >
                    <div>
                      <p className="text-sm font-medium" data-testid={`text-policy-number-${index}`}>
                        {policy.policyNumber}
                      </p>
                      {(policy.coverageAmount || policy.premiumAmount) && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-policy-details-${index}`}>
                          {policy.coverageAmount && `Coverage: ₹${policy.coverageAmount.toLocaleString("en-IN")}`}
                          {policy.coverageAmount && policy.premiumAmount && " | "}
                          {policy.premiumAmount && `Premium: ₹${policy.premiumAmount.toLocaleString("en-IN")}`}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" data-testid={`badge-policy-type-${index}`}>
                      {policy.policyType}
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
              <span>Your insurance polic{policies.length > 1 ? "ies" : "y"} will be securely linked</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>We'll track coverage amounts and premium schedules</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Policy status and maturity dates will be monitored</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>You can view detailed policy information in the Insurance section</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={linkPoliciesMutation.isPending}
          data-testid="button-back"
        >
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={linkPoliciesMutation.isPending}
          data-testid="button-confirm"
        >
          {linkPoliciesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm & Link
        </Button>
      </div>
    </div>
  );
}
