import { useState } from "react";
import { ChevronLeftIcon, ShieldCheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AAConsentProps {
  onContinue: () => void;
  onBack: () => void;
  userData?: {
    pan?: string;
    phone?: string;
  };
}

declare global {
  interface Window {
    finvuClient: {
      openV2: () => void;
      fiuInfo: (
        encryptedRequest: string,
        timestamp: string,
        fiuId: string,
        type?: string
      ) => Promise<void>;
    };
  }
}

export const AAConsent = ({ onContinue, onBack, userData }: AAConsentProps) => {
  const [isInitiating, setIsInitiating] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { toast } = useToast();

  const initiateConsent = async () => {
    if (!userData?.pan || !userData?.phone) {
      toast({
        title: "Missing Information",
        description: "PAN and phone number are required to proceed",
        variant: "destructive",
      });
      return;
    }

    setIsInitiating(true);

    try {
      // First check if user is authenticated with local server
      const authCheck = await fetch('/api/auth/user');
      if (!authCheck.ok) {
        // If not authenticated, redirect to login
        window.location.href = '/api/login';
        return;
      }

      // Call backend to initiate consent with FINVU
      const response = await fetch('/api/aa/consent/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pan: userData.pan,
          phone: userData.phone,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to initiate consent');
      }

      const data = await response.json();
      console.log('Consent Data:', data);

      // Initialize Finvu SDK
      if (window.finvuClient) {
        window.finvuClient.openV2();

        // Use data from backend or placeholders
        await window.finvuClient.fiuInfo(
          data.encryptedRequest || "encrypted_request_string", // Encrypted request from backend
          new Date().toISOString(),     // Current timestamp
          data.fiuId || "BARB0KIMXXX",  // Financial institution ID
          "FIU"                         // Optional institution type
        );
      } else {
        console.warn("Finvu SDK not loaded");
      }

      // Store consent metadata in localStorage for reference
      localStorage.setItem('aa_consent_handle', data.consentHandle || '');
      localStorage.setItem('aa_consent_id', data.consentId || '');

      // Advance the onboarding wizard to next step (sync screen)
      // This ensures the flow can continue when user returns from FINVU
      onContinue();

    } catch (error) {
      console.error('Failed to initiate consent:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unable to connect to Account Aggregator service",
        variant: "destructive",
      });
      setIsInitiating(false);
      setIsRedirecting(false);
    }
  };

  const benefits = [
    {
      icon: ShieldCheckIcon,
      title: "Secure & RBI Approved",
      description: "FINVU is an RBI-licensed Account Aggregator ensuring bank-grade security"
    },
    {
      icon: ShieldCheckIcon,
      title: "Complete Control",
      description: "You control what data to share and can revoke consent anytime"
    },
    {
      icon: ShieldCheckIcon,
      title: "One-Time Setup",
      description: "Link all your accounts once and get automatic portfolio updates"
    }
  ];

  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 w-full h-16">
        <div className="flex items-center h-full px-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2"
            disabled={isInitiating || isRedirecting}
            data-testid="button-back"
          >
            <ChevronLeftIcon className="w-6 h-6 text-[#cfd0d0]" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="space-y-6">
          {/* FINVU Branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-[#1a1b1d] rounded-full flex items-center justify-center border-2 border-[#2a2b2d]">
                {isRedirecting ? (
                  <Loader2Icon className="w-10 h-10 text-[#0a9f83] animate-spin" />
                ) : (
                  <ShieldCheckIcon className="w-10 h-10 text-[#0a9f83]" />
                )}
              </div>
            </div>
            <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-[24px] tracking-[-0.5px] leading-[30px]">
              {isRedirecting ? "Redirecting to FINVU..." : "Connect with FINVU"}
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5">
              {isRedirecting
                ? "Taking you to FINVU's secure portal to approve account access"
                : "India's trusted Account Aggregator for secure financial data sharing"}
            </p>
          </div>

          {!isRedirecting && (
            <>
              {/* Benefits */}
              <div className="space-y-3">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-[#1a1b1d] rounded-lg border border-[#2a2b2d]"
                    >
                      <div className="w-10 h-10 bg-[#08090a] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#0a9f83]" />
                      </div>
                      <div className="flex-1">
                        <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-sm mb-1">
                          {benefit.title}
                        </p>
                        <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs leading-[18px]">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* What happens next */}
              <div className="p-4 bg-[#1a1b1d] rounded-lg border border-[#2a2b2d] space-y-2">
                <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-xs mb-2">
                  WHAT HAPPENS NEXT:
                </p>
                <ul className="space-y-1.5 [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-[#0a9f83] mt-0.5">1.</span>
                    <span>You'll be redirected to FINVU's secure portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0a9f83] mt-0.5">2.</span>
                    <span>Select which financial institutions to link</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0a9f83] mt-0.5">3.</span>
                    <span>Approve consent to fetch your data securely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0a9f83] mt-0.5">4.</span>
                    <span>Return here to view your complete portfolio</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-6">
        <Button
          onClick={initiateConsent}
          disabled={isInitiating || isRedirecting}
          className="relative w-full h-12 bg-[#f3f3f3] rounded-lg hover:bg-[#e8e8e8] disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="button-continue-finvu"
        >
          {isInitiating || isRedirecting ? (
            <>
              <Loader2Icon className="w-5 h-5 text-[#131313] animate-spin" />
              <span className="ml-2 [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
                {isRedirecting ? "Redirecting..." : "Connecting..."}
              </span>
            </>
          ) : (
            <span className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
              Continue to FINVU
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
