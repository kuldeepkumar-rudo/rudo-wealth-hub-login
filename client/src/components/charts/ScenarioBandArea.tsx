import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ProjectionScenario {
  scenarioType: "worst" | "base" | "best";
  projectedValue: number;
  totalReturn: number;
  avgAnnualReturn: number;
  gainVsCurrent: number;
}

interface ScenarioBandAreaProps {
  currentValue: number;
  scenarios: ProjectionScenario[];
  showRestructured?: boolean;
}

export default function ScenarioBandArea({ 
  currentValue, 
  scenarios,
  showRestructured = false 
}: ScenarioBandAreaProps) {
  // Build data points for 5 years
  const years = ["Current", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
  
  const worstCase = scenarios.find(s => s.scenarioType === "worst");
  const baseCase = scenarios.find(s => s.scenarioType === "base");
  const bestCase = scenarios.find(s => s.scenarioType === "best");

  const data = years.map((year, index) => {
    if (index === 0) {
      return {
        year,
        worst: currentValue,
        base: currentValue,
        best: currentValue,
      };
    }

    // Use compound interest formula: FV = PV * (1 + r)^t
    return {
      year,
      worst: worstCase 
        ? currentValue * Math.pow(1 + worstCase.avgAnnualReturn / 100, index)
        : currentValue,
      base: baseCase 
        ? currentValue * Math.pow(1 + baseCase.avgAnnualReturn / 100, index)
        : currentValue,
      best: bestCase 
        ? currentValue * Math.pow(1 + bestCase.avgAnnualReturn / 100, index)
        : currentValue,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-md p-3 shadow-md">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-green-600">Best Case:</span>
              <span className="text-sm font-medium">₹{payload[2]?.value.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-primary">Base Case:</span>
              <span className="text-sm font-medium">₹{payload[1]?.value.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-orange-600">Worst Case:</span>
              <span className="text-sm font-medium">₹{payload[0]?.value.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
          </linearGradient>
          <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
          </linearGradient>
          <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="year"
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tickFormatter={formatYAxis}
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          formatter={(value) => <span className="text-sm capitalize">{value} Case</span>}
        />
        <ReferenceLine
          y={currentValue}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
          label={{ value: 'Current', position: 'right', fill: 'hsl(var(--muted-foreground))' }}
        />
        <Area
          type="monotone"
          dataKey="worst"
          stroke="#f97316"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorWorst)"
          name="worst"
        />
        <Area
          type="monotone"
          dataKey="base"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorBase)"
          name="base"
        />
        <Area
          type="monotone"
          dataKey="best"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorBest)"
          name="best"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
