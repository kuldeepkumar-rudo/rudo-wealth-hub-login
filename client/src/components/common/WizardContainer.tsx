import { useState } from "react";
import { useLocation } from "wouter";
import LinkStepHeader from "./LinkStepHeader";

export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<WizardStepProps>;
}

export interface WizardStepProps {
  onNext: (data?: any) => void;
  onBack: () => void;
  stepData: Record<string, any>;
}

interface WizardContainerProps {
  steps: WizardStep[];
  onComplete: (data: Record<string, any>) => void;
  backRoute?: string;
  testId?: string;
}

export default function WizardContainer({
  steps,
  onComplete,
  backRoute = "/connect",
  testId = "wizard",
}: WizardContainerProps) {
  const [, setLocation] = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  const currentStep = steps[currentStepIndex];
  const StepComponent = currentStep.component;

  const handleNext = (data?: any) => {
    // Save step data if provided
    if (data) {
      setStepData((prev) => ({ ...prev, [currentStep.id]: data }));
    }

    // Check if this is the last step
    if (currentStepIndex === steps.length - 1) {
      // Complete the wizard
      const finalData = data ? { ...stepData, [currentStep.id]: data } : stepData;
      onComplete(finalData);
    } else {
      // Move to next step
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      // Navigate back to the connect page
      setLocation(backRoute);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid={testId}>
      <div className="max-w-2xl mx-auto p-6">
        <LinkStepHeader
          title={currentStep.title}
          subtitle={currentStep.subtitle}
          currentStep={currentStepIndex + 1}
          totalSteps={steps.length}
          onBack={handleBack}
        />

        <div className="mt-6" data-testid={`${testId}-step-${currentStep.id}`}>
          <StepComponent onNext={handleNext} onBack={handleBack} stepData={stepData} />
        </div>
      </div>
    </div>
  );
}
