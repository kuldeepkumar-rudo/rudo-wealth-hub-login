import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface AllocationData {
  assetType: string;
  currentValue: number;
  currentAllocation: number;
}

interface AllocationDonutProps {
  data: AllocationData[];
  onSegmentClick?: (assetType: string) => void;
}

const COLORS = [
  "#10B981", // Green
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Funds",
  stock: "Stocks",
  fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits",
  insurance: "Insurance",
  bond: "Bonds",
  real_estate: "Real Estate",
  gold: "Gold",
  other: "Other",
};

export default function AllocationDonut({ data, onSegmentClick }: AllocationDonutProps) {
  const chartData = data.map((item) => ({
    name: ASSET_TYPE_LABELS[item.assetType] || item.assetType,
    value: item.currentValue,
    percentage: item.currentAllocation,
    assetType: item.assetType,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-md p-3 shadow-md">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            ₹{data.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-primary font-medium">
            {data.percentage.toFixed(1)}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percentage < 5) return null; // Hide labels for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={CustomLabel}
          outerRadius={120}
          innerRadius={60}
          fill="#8884d8"
          dataKey="value"
          onClick={(data) => onSegmentClick?.(data.assetType)}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-sm">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
