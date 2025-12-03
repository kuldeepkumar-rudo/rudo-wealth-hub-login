import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Building2 } from "lucide-react";
import AccountBadge from "@/components/common/AccountBadge";
import { WizardStepProps } from "@/components/common/WizardContainer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ConfirmFoliosStep({ onNext, stepData }: WizardStepProps) {
  const { toast } = useToast();
  const amc = stepData["select-amc"]?.amc;
  const { consentId, selectedFolios, folios } = stepData["link-folios"] || {};

  const [isCompleting, setIsCompleting] = useState(false);

  // Submit folio linking
  const linkFoliosMutation = useMutation({
    mutationFn: async () => {
      setIsCompleting(true);

      // Create linking session
      const sessionRes = await apiRequest("POST", "/api/linking-sessions", {
        userId: "demo-user",
        portfolioId: "demo-portfolio",
        assetType: "MUTUAL_FUNDS",
        institutionId: amc.id,
        institutionName: amc.name,
      });

      const sessionResponse = await sessionRes.json();
      const sessionId = sessionResponse.sessionId;

      // Link each folio
      for (const folio of folios) {
        await apiRequest("POST", "/api/mutual-fund-accounts", {
          userId: "demo-user",
          portfolioId: "demo-portfolio",
          sessionId,
          amcName: amc.name,
          amcCode: amc.code,
          folioNumber: folio.folioNumber,
          schemeName: folio.schemeName,
          units: folio.units,
          currentValue: folio.currentValue,
          investedValue: folio.currentValue * 0.85, // Placeholder
          status: "active",
        });
      }

      // Mark session as completed
      await apiRequest("PATCH", `/api/linking-sessions/${sessionId}`, {
        status: "completed",
      });

      return { sessionId };
    },
    onSuccess: () => {
      toast({
        title: "Folios Linked Successfully",
        description: `${folios?.length} folio(s) have been added to your portfolio`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/mutual-fund-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });

      setTimeout(() => {
        onNext();
      }, 1000);
    },
    onError: () => {
      setIsCompleting(false);
      toast({
        title: "Error",
        description: "Failed to link folios. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!folios || folios.length === 0) {
      toast({
        title: "Error",
        description: "No folios to link. Please go back and select at least one folio.",
        variant: "destructive",
      });
      return;
    }
    linkFoliosMutation.mutate();
  };

  return (
    <div className="space-y-6" data-testid="confirm-folios-step">
      <Card data-testid="card-summary">
        <CardHeader className="gap-1 space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Linking Summary</CardTitle>
              <CardDescription>{amc?.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Folios to Link</p>
            <div className="space-y-2">
              {folios?.map((folio: any) => (
                <div
                  key={folio.folioNumber}
                  className="flex items-start justify-between p-3 border rounded-md bg-muted/30"
                  data-testid={`summary-folio-${folio.folioNumber}`}
                >
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
                  <AccountBadge status="active" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Folios</span>
              <span className="font-medium" data-testid="text-total-folios">
                {folios?.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-medium" data-testid="text-total-value">
                ₹
                {folios
                  ?.reduce((sum: number, f: any) => sum + f.currentValue, 0)
                  .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isCompleting && (
        <Card data-testid="card-completing">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Linking Your Folios...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCompleting && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            disabled={linkFoliosMutation.isPending}
            data-testid="button-back"
          >
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={linkFoliosMutation.isPending}
            data-testid="button-confirm"
          >
            {linkFoliosMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Link {folios?.length} Folio(s)
          </Button>
        </div>
      )}
    </div>
  );
}
