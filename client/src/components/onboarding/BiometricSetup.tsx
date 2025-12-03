import { FingerprintIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BiometricSetupProps {
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const BiometricSetup = ({ onContinue, onSkip, onBack }: BiometricSetupProps) => {
  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="flex flex-col items-center">
          {/* Fingerprint icon */}
          <div className="flex items-center justify-center w-32 h-32 mb-8 bg-[#1a1b1d] rounded-full border-2 border-[#2a2b2d]">
            <FingerprintIcon className="w-16 h-16 text-[#0a9f83]" />
          </div>

          {/* Text content */}
          <div className="text-center space-y-3 mb-12">
            <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-[28px] tracking-[-0.5px] leading-[34px]">
              Enable Biometric Login
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5 max-w-[280px] mx-auto">
              Use your fingerprint or face ID for quick and secure access to your account
            </p>
          </div>

          {/* Benefits */}
          <div className="w-full space-y-3 mb-8">
            {[
              { title: 'Faster Login', desc: 'Access your account in seconds' },
              { title: 'Enhanced Security', desc: 'Your biometric data never leaves your device' },
              { title: 'Convenience', desc: 'No need to remember your MPIN each time' }
            ].map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 bg-[#1a1b1d] rounded-lg border border-[#2a2b2d]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#0a9f83] mt-2 flex-shrink-0" />
                <div>
                  <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-sm">
                    {benefit.title}
                  </p>
                  <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs mt-0.5">
                    {benefit.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={onContinue}
            className="relative w-full h-12 bg-[#f3f3f3] rounded-lg hover:bg-[#e8e8e8]"
            data-testid="button-enable"
          >
            <span className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
              Enable Biometric
            </span>
            <ArrowRightIcon className="absolute right-5 w-5 h-5 text-[#131313]" />
          </Button>
          <button
            onClick={onSkip}
            className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#a2a2a2] text-sm hover:text-[#cfd0d0] transition-colors"
            data-testid="button-skip"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
