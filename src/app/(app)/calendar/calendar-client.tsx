"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckSquare, ClipboardList, Video, Phone, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonthView, type CalendarItem } from "@/components/calendar/month-view";
import { formatDateTime, cn } from "@/lib/utils";
import { isSameDay } from "date-fns";
import EventFormModal from "./event-form-modal";

type Event = { id: string; title: string; type: string; start: string; end: string; notes: string | null; customer: string | null };
type TaskItem = { id: string; title: string; dueDate: string };
type FollowUpItem = { id: string; type: string; scheduledAt: string };
type Customer = { id: string; name: string };

const TYPE_TONE: Record<string, string> = { meeting: "brand", call: "info", demo: "success", deadline: "danger", "follow-up": "warning", task: "warning" };
const TYPE_ICON: Record<string, typeof Video> = { meeting: Video, call: Phone, demo: Video, deadline: AlertOctagon, "follow-up": ClipboardList, task: CheckSquare };
const TONE_BG_CLASS: Record<string, string> = {
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
};

export default function CalendarClient({ events, tasks, followUps, customers }: { events: Event[]; tasks: TaskItem[]; followUps: FollowUpItem[]; customers: Customer[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const items: CalendarItem[] = useMemo(() => [
    ...events.map((e) => ({ id: `event-${e.id}`, date: new Date(e.start), title: e.title, tone: TYPE_TONE[e.type] })),
    ...tasks.map((t) => ({ id: `task-${t.id}`, date: new Date(t.dueDate), title: `Task: ${t.title}`, tone: TYPE_TONE.task })),
    ...followUps.map((f) => ({ id: `fu-${f.id}`, date: new Date(f.scheduledAt), title: `Follow-up: ${f.type.replace(/_/g, " ")}`, tone: TYPE_TONE["follow-up"] })),
  ], [events, tasks, followUps]);

  const dayItems = items.filter((it) => isSameDay(it.date, selectedDay)).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="size-3.5" /> New Event</Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthView items={items} onSelectDay={setSelectedDay} onSelectItem={() => {}} />
        </div>
        <Card className="p-4 h-fit">
          <p className="mb-3 text-sm font-semibold text-foreground">{selectedDay.toDateString()}</p>
          {dayItems.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled for this day.</p>
          ) : (
            <div className="space-y-2.5">
              {dayItems.map((it) => {
                const kind = it.id.split("-")[0];
                const Icon = TYPE_ICON[kind === "event" ? (events.find((e) => `event-${e.id}` === it.id)?.type ?? "meeting") : kind === "task" ? "task" : "follow-up"];
                return (
                  <div key={it.id} className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                    <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", TONE_BG_CLASS[it.tone ?? "brand"])}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(it.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <EventFormModal open={formOpen} onOpenChange={setFormOpen} customers={customers} defaultDate={selectedDay} onSuccess={() => { setFormOpen(false); router.refresh(); }} />
    </div>
  );
}
