import { useState, useRef } from "react";
import { ArrowRightIcon, ChevronLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MPINCreationProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const MPINCreation = ({ value, onChange, onContinue, onBack }: MPINCreationProps) => {
  const [step, setStep] = useState<'new' | 'confirm'>('new');
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const currentPin = step === 'new' ? newPin : confirmPin;
  const setCurrentPin = step === 'new' ? setNewPin : setConfirmPin;

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    
    const newPinArray = [...currentPin];
    newPinArray[index] = val.slice(0, 1);
    setCurrentPin(newPinArray);
    setError('');

    // Auto-focus next input
    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (index === 3 && val && newPinArray.every(digit => digit !== '')) {
      if (step === 'new') {
        setTimeout(() => {
          setStep('confirm');
          setConfirmPin(['', '', '', '']);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }, 300);
      } else {
        // Verify pins match
        const newPinStr = newPin.join('');
        const confirmPinStr = newPinArray.join('');
        if (newPinStr === confirmPinStr) {
          onChange(newPinStr);
          setTimeout(onContinue, 500);
        } else {
          setError('PINs do not match');
          setTimeout(() => {
            setConfirmPin(['', '', '', '']);
            inputRefs.current[0]?.focus();
          }, 1000);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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
            onClick={step === 'confirm' ? () => setStep('new') : onBack} 
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
              {step === 'new' ? 'Create your MPIN' : 'Confirm your MPIN'}
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5">
              {step === 'new' 
                ? '4-digit PIN to secure your account' 
                : 'Re-enter your 4-digit PIN'}
            </p>
          </div>

          {/* PIN input */}
          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="flex justify-center gap-4">
              {currentPin.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-14 bg-[#1a1b1d] border border-[#2a2b2d] rounded-lg text-center text-[#cfd0d0] [font-family:'Be_Vietnam_Pro',Helvetica] text-2xl font-bold focus:border-[#0a9f83] focus:outline-none transition-colors"
                  maxLength={1}
                  autoFocus={index === 0}
                  data-testid={`input-pin-${index}`}
                />
              ))}
            </div>

            <button
              onClick={() => setShowPin(!showPin)}
              className="flex items-center gap-2 [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm hover:text-[#cfd0d0] transition-colors"
              data-testid="button-toggle-visibility"
            >
              {showPin ? (
                <>
                  <EyeOffIcon className="w-4 h-4" />
                  Hide PIN
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4" />
                  Show PIN
                </>
              )}
            </button>

            {error && (
              <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#ef4444] text-sm">
                {error}
              </p>
            )}
          </div>

          {/* Security tips */}
          <div className="pt-4 space-y-2">
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-xs">
              SECURITY TIPS:
            </p>
            <ul className="space-y-1.5 [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs">
              <li className="flex items-start gap-2">
                <span className="text-[#0a9f83] mt-0.5">•</span>
                <span>Don't use sequential numbers (1234)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0a9f83] mt-0.5">•</span>
                <span>Avoid your birth year or phone number</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0a9f83] mt-0.5">•</span>
                <span>Keep your PIN confidential</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
