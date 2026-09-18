import { cn } from "@/lib/utils";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-muted",
};

export function Badge({
  tone = "neutral",
  className,
  dot,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("size-1.5 rounded-full", `bg-current`)} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success", PROSPECT: "info", INACTIVE: "neutral", CHURNED: "danger",
  NEW: "info", CONTACTED: "brand", QUALIFIED: "brand", PROPOSAL: "warning",
  NEGOTIATION: "warning", WON: "success", LOST: "danger",
  TODO: "neutral", IN_PROGRESS: "brand", COMPLETED: "success", CANCELLED: "danger",
  LOW: "neutral", MEDIUM: "info", HIGH: "warning", URGENT: "danger",
  DRAFT: "neutral", SENT: "brand", PAID: "success", PARTIALLY_PAID: "warning",
  OVERDUE: "danger", PENDING: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return <Badge tone={tone} dot>{status.replace(/_/g, " ")}</Badge>;
}
