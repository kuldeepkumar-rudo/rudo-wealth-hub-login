import { useState } from "react";
import { ArrowRightIcon, ChevronLeftIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PhoneEntryProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const PhoneEntry = ({ value, onChange, onContinue, onBack }: PhoneEntryProps) => {
  const [countryCode, setCountryCode] = useState("+91");

  const handleContinue = () => {
    if (value.length === 10) {
      onContinue();
    }
  };

  const isValid = value.length === 10;

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
            data-testid="button-back"
          >
            <ChevronLeftIcon className="w-6 h-6 text-[#cfd0d0]" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-[28px] tracking-[-0.5px] leading-[34px]">
              Enter your mobile number
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5">
              We'll send you a verification code
            </p>
          </div>

          {/* Phone input */}
          <div className="space-y-4 pt-8">
            <div className="flex gap-3">
              <div className="w-20">
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-14 bg-[#1a1b1d] border-[#2a2b2d] text-[#cfd0d0] text-center [font-family:'Be_Vietnam_Pro',Helvetica] text-base"
                  data-testid="input-country-code"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    onChange(val);
                  }}
                  placeholder="Mobile number"
                  className="h-14 bg-[#1a1b1d] border-[#2a2b2d] text-[#cfd0d0] [font-family:'Be_Vietnam_Pro',Helvetica] text-base placeholder:text-[#5a5a5a]"
                  maxLength={10}
                  type="tel"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-[#1a1b1d] rounded-lg border border-[#2a2b2d]">
              <InfoIcon className="w-4 h-4 text-[#0a9f83] mt-0.5 flex-shrink-0" />
              <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs leading-[18px]">
                This number will be used for Account Aggregator authentication and important updates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-6">
        <Button
          onClick={handleContinue}
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
    </div>
  );
};
