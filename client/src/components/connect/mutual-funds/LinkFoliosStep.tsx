import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, ExternalLink, CheckCircle2, Clock, RefreshCw, Phone } from "lucide-react";
import { WizardStepProps } from "@/components/common/WizardContainer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Folio {
  folioNumber: string;
  schemeName: string;
  units: number;
  currentValue: number;
}

interface ConsentResponse {
  consentId: string;
  consentHandle: string;
  status: string;
  redirectUrl: string;
  message: string;
}

export default function LinkFoliosStep({ onNext, stepData }: WizardStepProps) {
  const { toast } = useToast();
  const amc = stepData["select-amc"]?.amc;
  const [consentData, setConsentData] = useState<ConsentResponse | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [selectedFolios, setSelectedFolios] = useState<Set<string>>(new Set());
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState("");

  const validateMobile = (value: string) => {
    const cleanMobile = value.replace(/\D/g, '').replace(/^(\+91|91)/, '');
    if (cleanMobile.length !== 10) {
      return "Please enter a valid 10-digit mobile number";
    }
    return "";
  };

  // Create AA consent
  const createConsentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/account-aggregator/consent", {
        purpose: "Mutual Fund Portfolio Tracking",
        fiTypes: ["MUTUAL_FUNDS"],
        dataRangeMonths: 24,
        validityMonths: 12,
        mobile: mobileNumber.replace(/\D/g, '').replace(/^(\+91|91)/, ''),
      });
      return await res.json();
    },
    onSuccess: (data: ConsentResponse) => {
      setConsentData(data);
      setAwaitingApproval(true); // Start polling immediately after consent creation
      toast({
        title: "Consent Created",
        description: "Please approve the consent on the Account Aggregator portal",
      });
    },
    onError: (error: any) => {
      console.error("Consent creation failed:", error);
      const errorMessage = error?.message || "Failed to create consent. Please try again or contact support if the issue persists.";
      toast({
        title: "Consent Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Poll for consent status when awaiting approval
  const { data: consentStatus, refetch: refetchStatus } = useQuery<{ status: string }>({
    queryKey: ['/api/account-aggregator/consent', consentData?.consentId, 'status'],
    queryFn: async () => {
      const res = await fetch(`/api/account-aggregator/consent/${consentData?.consentId}/status`);
      if (!res.ok) throw new Error('Failed to check consent status');
      return res.json();
    },
    enabled: awaitingApproval && !!consentData?.consentId,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Handle consent approval status change
  useEffect(() => {
    if (consentStatus?.status === 'ACTIVE') {
      setAwaitingApproval(false);
      toast({
        title: "Consent Approved",
        description: "Your consent has been approved. Fetching your folios...",
      });
    }
  }, [consentStatus?.status, toast]);

  // Discover folios after consent is approved
  const { data: folios, isLoading: isDiscovering } = useQuery<Folio[]>({
    queryKey: ['/api/account-aggregator/discover', consentData?.consentId],
    queryFn: async () => {
      const res = await fetch(`/api/account-aggregator/discover?consentId=${encodeURIComponent(consentData?.consentId || "")}`);
      if (!res.ok) throw new Error('Failed to discover folios');
      return res.json();
    },
    enabled: !!consentData?.consentId && consentStatus?.status === 'ACTIVE',
  });

  const handleInitiateConsent = () => {
    const error = validateMobile(mobileNumber);
    if (error) {
      setMobileError(error);
      toast({
        title: "Invalid Mobile Number",
        description: error,
        variant: "destructive",
      });
      return;
    }
    setMobileError("");
    createConsentMutation.mutate();
  };

  const handleToggleFolio = (folioNumber: string) => {
    const newSelected = new Set(selectedFolios);
    if (newSelected.has(folioNumber)) {
      newSelected.delete(folioNumber);
    } else {
      newSelected.add(folioNumber);
    }
    setSelectedFolios(newSelected);
  };

  // Handle opening Finvu approval portal
  const handleOpenApprovalPortal = () => {
    if (consentData?.redirectUrl) {
      window.open(consentData.redirectUrl, '_blank');
      setAwaitingApproval(true);
      toast({
        title: "Approval Portal Opened",
        description: "Please complete the approval on the Account Aggregator portal. We'll detect when you're done.",
      });
    }
  };

  const handleNext = () => {
    if (selectedFolios.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one folio to link",
        variant: "destructive",
      });
      return;
    }

    const selectedFolioData = folios?.filter((f) => selectedFolios.has(f.folioNumber)) || [];
    
    if (selectedFolioData.length === 0) {
      toast({
        title: "Error",
        description: "Unable to find selected folios. Please try again.",
        variant: "destructive",
      });
      return;
    }

    onNext({
      consentId: consentData?.consentId,
      selectedFolios: Array.from(selectedFolios),
      folios: selectedFolioData,
    });
  };

  return (
    <div className="space-y-6" data-testid="link-folios-step">
      <Card data-testid="card-selected-amc">
        <CardHeader className="gap-1 space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Selected AMC</CardTitle>
              <CardDescription className="text-sm">{amc?.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step 1: Initiate Consent */}
      {!consentData && (
        <Card data-testid="card-initiate-consent">
          <CardHeader className="gap-1 space-y-0 pb-4">
            <CardTitle className="text-base">Link Mutual Fund Accounts</CardTitle>
            <CardDescription>
              Connect your mutual fund folios via Account Aggregator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We'll request your consent to fetch mutual fund holdings from {amc?.name}.
              You'll be redirected to the Account Aggregator portal to approve.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="mobile-number" className="text-sm font-medium">
                Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile-number"
                  type="tel"
                  placeholder="Enter your 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value);
                    if (mobileError) setMobileError("");
                  }}
                  className={`pl-9 ${mobileError ? 'border-destructive' : ''}`}
                  data-testid="input-mobile-number"
                />
              </div>
              {mobileError && (
                <p className="text-xs text-destructive" data-testid="text-mobile-error">{mobileError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This should be the mobile number registered with your financial institutions.
              </p>
            </div>
            
            <Button
              onClick={handleInitiateConsent}
              disabled={createConsentMutation.isPending || !mobileNumber}
              data-testid="button-initiate-consent"
            >
              {createConsentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Initiate Account Linking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Approve on Finvu Portal */}
      {consentData && consentStatus?.status !== 'ACTIVE' && (
        <Card data-testid="card-approve-consent">
          <CardHeader className="gap-1 space-y-0 pb-4">
            <CardTitle className="text-base">Approve Consent</CardTitle>
            <CardDescription>
              Complete the approval on the Account Aggregator portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-md bg-muted/50 border">
              <div className="flex items-start gap-3">
                {awaitingApproval ? (
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-primary mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">
                    {awaitingApproval 
                      ? "Waiting for your approval..." 
                      : "Click below to approve your consent"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {awaitingApproval 
                      ? "Complete the approval on the Account Aggregator portal. This page will update automatically."
                      : "You'll be taken to the secure Account Aggregator portal to verify your identity and approve data sharing."}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleOpenApprovalPortal}
                disabled={!consentData.redirectUrl}
                data-testid="button-open-approval-portal"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {awaitingApproval ? "Re-open Portal" : "Open Approval Portal"}
              </Button>
              
              {awaitingApproval && (
                <Button
                  variant="outline"
                  onClick={() => refetchStatus()}
                  data-testid="button-check-status"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Status
                </Button>
              )}
            </div>

            {awaitingApproval && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking for approval... Status: {consentStatus?.status || 'PENDING'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Discovering Folios */}
      {consentData && consentStatus?.status === 'ACTIVE' && isDiscovering && (
        <Card data-testid="card-discovering">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Discovering your mutual fund folios...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Select Folios */}
      {folios && folios.length > 0 && (
        <Card data-testid="card-select-folios">
          <CardHeader className="gap-1 space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Select Folios to Link</CardTitle>
            </div>
            <CardDescription>Choose which folios you want to track</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {folios.map((folio) => (
              <div
                key={folio.folioNumber}
                className="flex items-start gap-3 p-3 border rounded-md hover-elevate"
                data-testid={`folio-item-${folio.folioNumber}`}
              >
                <Checkbox
                  checked={selectedFolios.has(folio.folioNumber)}
                  onCheckedChange={() => handleToggleFolio(folio.folioNumber)}
                  data-testid={`checkbox-folio-${folio.folioNumber}`}
                />
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm" data-testid={`text-scheme-${folio.folioNumber}`}>
                    {folio.schemeName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Folio: {folio.folioNumber}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span>Units: {folio.units.toFixed(3)}</span>
                    <span>
                      Value: ₹{folio.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Folios Found */}
      {consentStatus?.status === 'ACTIVE' && folios && folios.length === 0 && (
        <Card data-testid="card-no-folios">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No folios found for this AMC.</p>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      {folios && folios.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleNext}
            disabled={selectedFolios.size === 0}
            data-testid="button-next-step"
          >
            Continue ({selectedFolios.size} selected)
          </Button>
        </div>
      )}
    </div>
  );
}
