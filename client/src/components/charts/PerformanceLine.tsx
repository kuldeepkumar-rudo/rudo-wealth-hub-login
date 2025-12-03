import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";

interface BenchmarkDataPoint {
  period: string;
  portfolioValue: number;
  benchmarkValue: number;
  date: string;
}

interface PerformanceLineProps {
  data: BenchmarkDataPoint[];
  showBrush?: boolean;
}

export default function PerformanceLine({ data, showBrush = true }: PerformanceLineProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const portfolio = payload[0].value;
      const benchmark = payload[1]?.value || 0;
      const diff = portfolio - benchmark;
      const diffPercent = benchmark > 0 ? (diff / benchmark) * 100 : 0;

      return (
        <div className="bg-card border rounded-md p-3 shadow-md">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-sm">Portfolio: ₹{portfolio.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
              <span className="text-sm">Benchmark: ₹{benchmark.toLocaleString('en-IN')}</span>
            </div>
            <div className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff >= 0 ? '+' : ''}₹{diff.toLocaleString('en-IN')} ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
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
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="period"
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
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-sm">{value}</span>}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Line
          type="monotone"
          dataKey="portfolioValue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          name="Your Portfolio"
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="benchmarkValue"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Benchmark"
        />
        {showBrush && (
          <Brush
            dataKey="period"
            height={30}
            stroke="hsl(var(--primary))"
            fill="hsl(var(--muted))"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
