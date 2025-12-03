import { useState } from "react";
import { useLocation } from "wouter";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { PhoneEntry } from "@/components/onboarding/PhoneEntry";
import { OTPVerification } from "@/components/onboarding/OTPVerification";
import { MPINCreation } from "@/components/onboarding/MPINCreation";
import { BiometricSetup } from "@/components/onboarding/BiometricSetup";
import { PANCollection } from "@/components/onboarding/PANCollection";
import { AAConsent } from "@/components/onboarding/AAConsent";
import { AssetSelection } from "@/components/onboarding/AssetSelection";
import { DataSync } from "@/components/onboarding/DataSync";
import { PortfolioPreview } from "@/components/onboarding/PortfolioPreview";

export type OnboardingStep =
  // | 'splash'
  | 'phone'
  | 'otp'
  // | 'mpin'
  // | 'biometric'
  | 'pan'
  | 'consent'
  | 'assets'
  | 'sync'
  | 'preview';

interface OnboardingData {
  phone: string;
  otp: string;
  mpin: string;
  biometricEnabled: boolean;
  pan: string;
  selectedAssets: string[];
}

export const AppOnboarding = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('phone');
  const [data, setData] = useState<OnboardingData>({
    phone: '9999999999',
    otp: '123456',
    mpin: '',
    biometricEnabled: false,
    pan: 'ABCDE1234F',
    selectedAssets: [],
  });

  const updateData = (key: keyof OnboardingData, value: string | boolean | string[]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = [
      'phone', 'otp',
      'pan', 'consent', 'assets', 'sync', 'preview'
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else if (currentIndex === steps.length - 1) {
      // Complete onboarding and navigate to dashboard
      setLocation('/dashboard');
    }
  };

  const prevStep = () => {
    const steps: OnboardingStep[] = [
      'phone', 'otp',
      'pan', 'consent', 'assets', 'sync', 'preview'
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="flex items-start justify-center h-screen bg-[#08090a] overflow-hidden">
      {/* {currentStep === 'phone' && <SplashScreen onContinue={nextStep} />} */}
      {currentStep === 'phone' && (
        <PhoneEntry
          value={data.phone}
          onChange={(val: string) => updateData('phone', val)}
          onContinue={nextStep}
          onBack={prevStep}
        />
      )}
      {currentStep === 'otp' && (
        <OTPVerification
          phone={data.phone}
          value={data.otp}
          onChange={(val: string) => updateData('otp', val)}
          onContinue={nextStep}
          onBack={prevStep}
        />
      )}
      {/* {currentStep === 'mpin' && (
        <MPINCreation
          value={data.mpin}
          onChange={(val: string) => updateData('mpin', val)}
          onContinue={nextStep}
          onBack={prevStep}
        />
      )} */}
      {/* {currentStep === 'biometric' && (
        <BiometricSetup
          onContinue={nextStep}
          onSkip={nextStep}
          onBack={prevStep}
        />
      )} */}
      {currentStep === 'pan' && (
        <PANCollection
          value={data.pan}
          onChange={(val: string) => updateData('pan', val)}
          onContinue={nextStep}
          onBack={prevStep}
        />
      )}
      {currentStep === 'consent' && (
        <AAConsent
          onContinue={nextStep}
          onBack={prevStep}
          userData={{
            pan: data.pan,
            phone: data.phone,
          }}
        />
      )}
      {currentStep === 'assets' && (
        <AssetSelection
          selected={data.selectedAssets}
          onChange={(val: string[]) => updateData('selectedAssets', val)}
          onContinue={nextStep}
          onBack={prevStep}
        />
      )}
      {currentStep === 'sync' && (
        <DataSync
          onComplete={nextStep}
        />
      )}
      {currentStep === 'preview' && (
        <PortfolioPreview onContinue={nextStep} />
      )}
    </div>
  );
};
