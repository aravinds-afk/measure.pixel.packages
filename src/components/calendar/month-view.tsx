"use client";

import { useState } from "react";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, isSameMonth, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarItem = { id: string; date: Date; title: string; tone?: string };

const TONE_CLASS: Record<string, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function MonthView({ items, onSelectItem, onSelectDay }: { items: CalendarItem[]; onSelectItem?: (id: string) => void; onSelectDay?: (date: Date) => void }) {
  const [cursor, setCursor] = useState(new Date());
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{format(cursor, "MMMM yyyy")}</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => subMonths(c, 1))}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-b border-border bg-surface-2 py-2 text-center text-xs font-medium text-muted">{d}</div>
        ))}
        {days.map((day, i) => {
          const dayItems = items.filter((it) => isSameDay(it.date, day));
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={i}
              onClick={() => onSelectDay?.(day)}
              className={cn(
                "min-h-[92px] border-b border-r border-border p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-surface-2/40",
                onSelectDay && "cursor-pointer"
              )}
            >
              <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", today ? "bg-brand text-white font-semibold" : inMonth ? "text-foreground" : "text-muted/60")}>
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    onClick={(e) => { e.stopPropagation(); onSelectItem?.(it.id); }}
                    className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium", TONE_CLASS[it.tone ?? "brand"])}
                  >
                    {it.title}
                  </button>
                ))}
                {dayItems.length > 3 && <p className="px-1.5 text-[10px] text-muted">+{dayItems.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
