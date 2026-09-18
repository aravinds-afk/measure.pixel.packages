"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Target, ListChecks, ClipboardList, Wallet, Receipt, Handshake, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { cn, timeAgo } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";

type Notif = { id: string; title: string; message: string; read: boolean; createdAt: string; type: string };

const TYPE_ICON: Record<string, typeof Bell> = {
  LEAD: Target, TASK: ListChecks, FOLLOWUP: ClipboardList, PAYMENT: Wallet, INVOICE: Receipt, DEAL: Handshake,
};

export default function NotificationsClient({ initialNotifications }: { initialNotifications: Notif[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pending, startTransition] = useTransition();

  const list = filter === "unread" ? initialNotifications.filter((n) => !n.read) : initialNotifications;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1 w-fit">
          {(["all", "unread"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}>{f}</button>
          ))}
        </div>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => startTransition(async () => { await markAllNotificationsRead(); router.refresh(); })}>
          <CheckCheck className="size-3.5" /> Mark all read
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing here" description="You're all caught up on notifications." />
      ) : (
        <div className="space-y-2">
          {list.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <div
                key={n.id}
                className={cn("flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer", !n.read && "bg-brand-soft/30")}
                onClick={() => { if (!n.read) startTransition(async () => { await markNotificationRead(n.id); router.refresh(); }); }}
              >
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", n.read ? "bg-surface-2 text-muted" : "bg-brand-soft text-brand")}>
                  <Icon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-sm text-muted">{n.message}</p>
                  <p className="mt-1 text-xs text-muted/70">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
