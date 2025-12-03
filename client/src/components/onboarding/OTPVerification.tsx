import { useState, useRef, useEffect } from "react";
import { ArrowRightIcon, ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OTPVerificationProps {
  phone: string;
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const OTPVerification = ({ phone, value, onChange, onContinue, onBack }: OTPVerificationProps) => {
  const [otp, setOtp] = useState(() => {
    if (value && value.length === 6) {
      return value.split('');
    }
    return ['', '', '', '', '', ''];
  });
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val.slice(0, 1);
    setOtp(newOtp);
    onChange(newOtp.join(''));

    // Auto-focus next input
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 5 && val && newOtp.every(digit => digit !== '')) {
      setTimeout(() => onContinue(), 500);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setTimer(30);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every(digit => digit !== '');

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
              Enter verification code
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5">
              We've sent a 6-digit code to +91 {phone}
            </p>
          </div>

          {/* OTP input */}
          <div className="flex justify-center gap-3 pt-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 bg-[#1a1b1d] border border-[#2a2b2d] rounded-lg text-center text-[#cfd0d0] [font-family:'Be_Vietnam_Pro',Helvetica] text-xl font-medium focus:border-[#0a9f83] focus:outline-none transition-colors"
                maxLength={1}
                autoFocus={index === 0}
                data-testid={`input-otp-${index}`}
              />
            ))}
          </div>

          {/* Resend code */}
          <div className="text-center pt-4">
            {timer > 0 ? (
              <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm">
                Resend code in {timer}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#0a9f83] text-sm hover:underline"
                data-testid="button-resend"
              >
                Resend code
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-6">
        <Button
          onClick={onContinue}
          disabled={!isComplete}
          className="relative w-full h-12 bg-[#f3f3f3] rounded-lg hover:bg-[#e8e8e8] disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="button-continue"
        >
          <span className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
            Verify
          </span>
          <ArrowRightIcon className="absolute right-5 w-5 h-5 text-[#131313]" />
        </Button>
      </div>
    </div>
  );
};
