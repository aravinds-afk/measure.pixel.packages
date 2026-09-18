import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; positive?: boolean };
  tone?: "brand" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass = {
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn("flex size-9 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-4.5" />
        </div>
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", trend.positive ? "text-success" : "text-danger")}>
            {trend.positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </Card>
  );
}
