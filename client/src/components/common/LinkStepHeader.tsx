import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LinkStepHeaderProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
}

export default function LinkStepHeader({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  showBack = true,
}: LinkStepHeaderProps) {
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-4" data-testid="link-step-header">
      {showBack && onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="button-back"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-semibold" data-testid="text-step-title">
            {title}
          </h2>
          <span className="text-sm text-muted-foreground" data-testid="text-step-count">
            {currentStep} of {totalSteps}
          </span>
        </div>

        {subtitle && (
          <p className="text-sm text-muted-foreground" data-testid="text-step-subtitle">
            {subtitle}
          </p>
        )}

        <Progress value={progressValue} className="h-1" data-testid="progress-step" />
      </div>
    </div>
  );
}
