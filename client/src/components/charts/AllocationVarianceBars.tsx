import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AllocationData {
  assetType: string;
  currentAllocation: number;
  recommendedAllocation: number | null;
}

interface AllocationVarianceBarsProps {
  data: AllocationData[];
  onBarClick?: (assetType: string) => void;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Funds",
  stock: "Stocks",
  fixed_deposit: "FDs",
  recurring_deposit: "RDs",
  insurance: "Insurance",
  bond: "Bonds",
  real_estate: "Real Estate",
  gold: "Gold",
  other: "Other",
};

export default function AllocationVarianceBars({ data, onBarClick }: AllocationVarianceBarsProps) {
  const chartData = data
    .filter(item => item.recommendedAllocation !== null)
    .map((item) => ({
      name: ASSET_TYPE_LABELS[item.assetType] || item.assetType,
      current: item.currentAllocation,
      recommended: item.recommendedAllocation || 0,
      deviation: item.currentAllocation - (item.recommendedAllocation || 0),
      assetType: item.assetType,
    }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)); // Sort by largest deviation

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload[0].value;
      const recommended = payload[1].value;
      const deviation = current - recommended;

      return (
        <div className="bg-card border rounded-md p-3 shadow-md">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Current:</span>
              <span className="text-sm font-medium">{current.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Recommended:</span>
              <span className="text-sm font-medium">{recommended.toFixed(1)}%</span>
            </div>
            <div className={`flex items-center justify-between gap-4 ${deviation > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              <span className="text-sm">Variance:</span>
              <span className="text-sm font-bold">{deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%</span>
            </div>
            {Math.abs(deviation) > 3 && (
              <p className="text-xs text-muted-foreground mt-1">
                {deviation > 0 ? 'Over-allocated' : 'Under-allocated'}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        onClick={(data) => {
          if (data && data.activePayload) {
            onBarClick?.(data.activePayload[0].payload.assetType);
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          label={{ value: 'Allocation %', angle: -90, position: 'insideLeft' }}
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-sm capitalize">{value}</span>}
        />
        <Bar
          dataKey="current"
          fill="hsl(var(--primary))"
          name="Current %"
          radius={[4, 4, 0, 0]}
          className="cursor-pointer hover:opacity-80"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-current-${index}`}
              fill={Math.abs(entry.deviation) > 5 ? "#f97316" : "hsl(var(--primary))"}
            />
          ))}
        </Bar>
        <Bar
          dataKey="recommended"
          fill="hsl(var(--muted-foreground))"
          name="Recommended %"
          radius={[4, 4, 0, 0]}
          opacity={0.6}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
