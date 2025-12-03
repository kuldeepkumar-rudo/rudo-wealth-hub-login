import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

interface DataPoint {
  date: string | Date;
  [key: string]: any;
}

interface ChartSeries {
  dataKey: string;
  label: string;
  color: string;
  format?: "currency" | "percentage" | "number";
}

interface HistoricalChartProps {
  data: DataPoint[];
  series: ChartSeries[];
  type?: "line" | "area";
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  dateFormat?: string;
  testId?: string;
}

export default function HistoricalChart({
  data,
  series,
  type = "line",
  height = 300,
  showLegend = true,
  showGrid = true,
  dateFormat = "MMM dd",
  testId = "historical-chart",
}: HistoricalChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    date: point.date instanceof Date ? point.date : new Date(point.date),
  }));

  const formatValue = (value: number, formatType?: ChartSeries["format"]): string => {
    switch (formatType) {
      case "currency":
        return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      case "percentage":
        return `${value.toFixed(2)}%`;
      case "number":
        return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      default:
        return String(value);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-md p-3 shadow-md" data-testid={`${testId}-tooltip`}>
          <p className="font-semibold text-sm mb-2">
            {format(label, dateFormat)}
          </p>
          {payload.map((entry: any, index: number) => {
            const seriesConfig = series.find((s) => s.dataKey === entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">{seriesConfig?.label}:</span>
                <span className="font-medium" style={{ color: entry.color }}>
                  {formatValue(entry.value, seriesConfig?.format)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div data-testid={testId}>
      <ResponsiveContainer width="100%" height={height}>
        {type === "area" ? (
          <AreaChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(date, dateFormat)}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value) => formatValue(value, series[0]?.format)}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                formatter={(value) => {
                  const seriesConfig = series.find((s) => s.dataKey === value);
                  return (
                    <span className="text-sm" data-testid={`${testId}-legend-${value}`}>
                      {seriesConfig?.label || value}
                    </span>
                  );
                }}
              />
            )}
            {series.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                data-testid={`${testId}-series-${s.dataKey}`}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(date, dateFormat)}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value) => formatValue(value, series[0]?.format)}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                formatter={(value) => {
                  const seriesConfig = series.find((s) => s.dataKey === value);
                  return (
                    <span className="text-sm" data-testid={`${testId}-legend-${value}`}>
                      {seriesConfig?.label || value}
                    </span>
                  );
                }}
              />
            )}
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                data-testid={`${testId}-series-${s.dataKey}`}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
