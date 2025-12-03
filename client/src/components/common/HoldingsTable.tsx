import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  format?: "currency" | "percentage" | "number" | "badge" | "change";
  className?: string;
}

interface HoldingsTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any, index: number) => void;
  emptyMessage?: string;
  testId?: string;
}

export default function HoldingsTable({
  columns,
  data,
  onRowClick,
  emptyMessage = "No holdings found",
  testId = "holdings-table",
}: HoldingsTableProps) {
  const formatValue = (value: any, format?: Column["format"], rowIndex?: number, columnKey?: string) => {
    if (value === null || value === undefined) return "-";

    switch (format) {
      case "currency":
        return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
      case "percentage":
        return `${Number(value).toFixed(2)}%`;
      case "number":
        return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
      case "badge":
        return (
          <Badge
            variant="outline"
            data-testid={`badge-${rowIndex}-${columnKey}`}
          >
            {value}
          </Badge>
        );
      case "change":
        return renderChange(Number(value), rowIndex, columnKey);
      default:
        return value;
    }
  };

  const renderChange = (change: number, rowIndex?: number, columnKey?: string) => {
    if (change === 0) {
      return (
        <div
          className="flex items-center gap-1 text-muted-foreground"
          data-testid={`change-indicator-${rowIndex}-${columnKey}`}
        >
          <Minus className="h-3 w-3" />
          <span>0.00%</span>
        </div>
      );
    }

    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

    return (
      <div
        className={`flex items-center gap-1 ${colorClass}`}
        data-testid={`change-indicator-${rowIndex}-${columnKey}`}
      >
        <Icon className="h-3 w-3" />
        <span>{Math.abs(change).toFixed(2)}%</span>
      </div>
    );
  };

  const getAlignClass = (align?: Column["align"]) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-32 text-muted-foreground"
        data-testid={`${testId}-empty`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border rounded-md" data-testid={testId}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`${getAlignClass(column.align)} ${column.className || ""}`}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              onClick={() => onRowClick?.(row, rowIndex)}
              className={onRowClick ? "cursor-pointer hover-elevate" : ""}
              data-testid={`${testId}-row-${rowIndex}`}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={`${getAlignClass(column.align)} ${column.className || ""}`}
                  data-testid={`${testId}-cell-${rowIndex}-${column.key}`}
                >
                  {formatValue(row[column.key], column.format, rowIndex, column.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
