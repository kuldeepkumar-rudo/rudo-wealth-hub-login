import { useState } from "react";
import { ArrowRightIcon, ChevronLeftIcon, InfoIcon, HelpCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PANCollectionProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const PANCollection = ({ value, onChange, onContinue, onBack }: PANCollectionProps) => {
  const [showInfo, setShowInfo] = useState(false);

  const handleChange = (val: string) => {
    // Format: ABCDE1234F
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    onChange(formatted);
  };

  const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);

  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 w-full h-16">
        <div className="flex items-center justify-between h-full px-4">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2"
            data-testid="button-back"
          >
            <ChevronLeftIcon className="w-6 h-6 text-[#cfd0d0]" />
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 -mr-2"
            data-testid="button-info"
          >
            <HelpCircleIcon className="w-6 h-6 text-[#cfd0d0]" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-[28px] tracking-[-0.5px] leading-[34px]">
              Enter your PAN
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5">
              Required for Account Aggregator authentication
            </p>
          </div>

          {/* PAN input */}
          <div className="space-y-4 pt-8">
            <Input
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="ABCDE1234F"
              className="h-14 bg-[#1a1b1d] border-[#2a2b2d] text-[#cfd0d0] [font-family:'Be_Vietnam_Pro',Helvetica] text-base placeholder:text-[#5a5a5a] tracking-widest"
              maxLength={10}
              data-testid="input-pan"
            />

            <div className="flex items-start gap-2 p-3 bg-[#1a1b1d] rounded-lg border border-[#2a2b2d]">
              <InfoIcon className="w-4 h-4 text-[#0a9f83] mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-xs">
                  Why do we need your PAN?
                </p>
                <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs leading-[18px]">
                  PAN is required by RBI's Account Aggregator framework to securely fetch your financial data from banks, mutual funds, and other institutions.
                </p>
              </div>
            </div>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <div className="w-2 h-2 rounded-full bg-[#0a9f83]" />
              <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs">
                Your data is encrypted and secure
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-6">
        <Button
          onClick={onContinue}
          disabled={!isValid}
          className="relative w-full h-12 bg-[#f3f3f3] rounded-lg hover:bg-[#e8e8e8] disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="button-continue"
        >
          <span className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
            Continue
          </span>
          <ArrowRightIcon className="absolute right-5 w-5 h-5 text-[#131313]" />
        </Button>
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="w-[320px] bg-[#1a1b1d] border-[#2a2b2d] text-[#cfd0d0]">
          <DialogHeader>
            <DialogTitle className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0]">
              About PAN Verification
            </DialogTitle>
            <DialogDescription className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm space-y-3">
              <p>
                Your PAN (Permanent Account Number) is used to:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-[#0a9f83]">•</span>
                  <span>Verify your identity with financial institutions</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#0a9f83]">•</span>
                  <span>Securely fetch your investment data</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#0a9f83]">•</span>
                  <span>Comply with RBI's Account Aggregator guidelines</span>
                </li>
              </ul>
              <p className="text-xs pt-2">
                Your PAN is never stored in plain text and is encrypted at all times.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};
