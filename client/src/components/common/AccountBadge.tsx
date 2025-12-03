import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

type AccountStatus = "active" | "pending" | "inactive" | "error";
type AccountType = "folio" | "demat" | "savings" | "fd" | "rd" | "policy";

interface AccountBadgeProps {
  status?: AccountStatus;
  type?: AccountType;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  AccountStatus,
  { icon: any; variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  active: {
    icon: CheckCircle2,
    variant: "default",
    label: "Active",
  },
  pending: {
    icon: Clock,
    variant: "secondary",
    label: "Pending",
  },
  inactive: {
    icon: XCircle,
    variant: "outline",
    label: "Inactive",
  },
  error: {
    icon: AlertCircle,
    variant: "destructive",
    label: "Error",
  },
};

const TYPE_LABELS: Record<AccountType, string> = {
  folio: "Folio",
  demat: "Demat",
  savings: "Savings",
  fd: "FD",
  rd: "RD",
  policy: "Policy",
};

export default function AccountBadge({ status, type, label, className }: AccountBadgeProps) {
  if (label) {
    return (
      <Badge variant="outline" className={className} data-testid="badge-custom-label">
        {label}
      </Badge>
    );
  }

  if (status) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge
        variant={config.variant}
        className={`gap-1 ${className || ""}`}
        data-testid={`badge-status-${status}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  if (type) {
    return (
      <Badge variant="secondary" className={className} data-testid={`badge-type-${type}`}>
        {TYPE_LABELS[type]}
      </Badge>
    );
  }

  return null;
}
