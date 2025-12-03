import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricStat {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  format?: "currency" | "percentage" | "number" | "text";
  testId?: string;
}

interface MetricStatGroupProps {
  metrics: MetricStat[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export default function MetricStatGroup({ metrics, columns = 3, className }: MetricStatGroupProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  const formatValue = (value: string | number, format?: MetricStat["format"]) => {
    if (typeof value === "string") return value;

    switch (format) {
      case "currency":
        return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      case "percentage":
        return `${value.toFixed(2)}%`;
      case "number":
        return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      default:
        return value;
    }
  };

  const renderChange = (change?: number, changeLabel?: string, testId?: string) => {
    if (change === undefined) return null;

    const isPositive = change > 0;
    const isNeutral = change === 0;
    const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const colorClass = isNeutral
      ? "text-muted-foreground"
      : isPositive
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass}`} data-testid={`${testId}-change`}>
        <Icon className="h-3 w-3" />
        <span>
          {Math.abs(change).toFixed(2)}%{changeLabel && ` ${changeLabel}`}
        </span>
      </div>
    );
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className || ""}`}>
      {metrics.map((metric, index) => {
        const baseTestId = metric.testId || `metric-${index}`;
        return (
          <Card key={index} data-testid={baseTestId}>
            <CardContent className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-semibold" data-testid={`${baseTestId}-value`}>
                {formatValue(metric.value, metric.format)}
              </p>
              {renderChange(metric.change, metric.changeLabel, baseTestId)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
