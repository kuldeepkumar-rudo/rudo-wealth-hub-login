import { useEffect, useState } from "react";
import { Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DataSyncProps {
  onComplete: () => void;
}

export const DataSync = ({ onComplete }: DataSyncProps) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Connecting to Account Aggregator', duration: 1500 },
    { label: 'Authenticating with financial institutions', duration: 2000 },
    { label: 'Fetching your investment data', duration: 2500 },
    { label: 'Analyzing portfolio composition', duration: 1500 },
    { label: 'Calculating returns and insights', duration: 1000 }
  ];

  useEffect(() => {
    let stepIndex = 0;
    let currentProgress = 0;

    const runStep = () => {
      if (stepIndex >= steps.length) {
        setProgress(100);
        setTimeout(onComplete, 800);
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      const stepProgress = 100 / steps.length;
      const startProgress = stepIndex * stepProgress;

      const interval = setInterval(() => {
        currentProgress += 2;
        const actualProgress = Math.min(startProgress + (currentProgress / 100) * stepProgress, (stepIndex + 1) * stepProgress);
        setProgress(actualProgress);

        if (currentProgress >= 100) {
          clearInterval(interval);
          currentProgress = 0;
          stepIndex++;
          setTimeout(runStep, 300);
        }
      }, step.duration / 50);
    };

    runStep();
  }, [onComplete]);

  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="flex flex-col items-center">
          {/* Loading animation */}
          <div className="flex items-center justify-center w-32 h-32 mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a9f83] to-[#08090a] rounded-full opacity-20 animate-pulse" />
            <Loader2Icon className="w-16 h-16 text-[#0a9f83] animate-spin" />
          </div>

          {/* Progress */}
          <div className="w-full max-w-[280px] space-y-4 mb-8">
            <Progress 
              value={progress} 
              className="h-2 bg-[#1a1b1d] [&>div]:bg-gradient-to-r [&>div]:from-[#0a9f83] [&>div]:to-[#06b894]"
            />
            <p className="text-center [font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-sm">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Current status */}
          <div className="space-y-3 w-full max-w-[280px]">
            <h2 className="text-center [font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-xl mb-6">
              Setting up your portfolio
            </h2>
            
            {steps.map((step, index) => {
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;
              const isPending = index > currentStep;

              return (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrent ? 'bg-[#1a1b1d] border border-[#2a2b2d]' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2Icon className="w-5 h-5 text-[#0a9f83]" />
                    ) : isCurrent ? (
                      <Loader2Icon className="w-5 h-5 text-[#0a9f83] animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#3a3b3d]" />
                    )}
                  </div>
                  <p className={`[font-family:'Be_Vietnam_Pro',Helvetica] text-sm ${
                    isComplete || isCurrent ? 'text-[#cfd0d0] font-medium' : 'text-[#5a5a5a] font-light'
                  }`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <p className="text-center [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs mt-12 max-w-[260px]">
            This may take a few moments. Please don't close the app.
          </p>
        </div>
      </div>
    </div>
  );
};
