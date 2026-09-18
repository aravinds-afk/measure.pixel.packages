"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Dropdown, DropdownContent, DropdownTrigger } from "@/components/ui/dropdown";
import { markAllNotificationsRead } from "@/actions/notifications";
import { timeAgo, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Notif = { id: string; title: string; message: string; read: boolean; createdAt: string; type: string };

export function NotificationBell({ notifications, unreadCount }: { notifications: Notif[]; unreadCount: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="relative flex size-9.5 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground">
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <button
            disabled={pending}
            onClick={() => startTransition(async () => { await markAllNotificationsRead(); router.refresh(); })}
            className="flex items-center gap-1 text-xs font-medium text-brand hover:underline disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>
          )}
          {notifications.map((n) => (
            <div key={n.id} className={cn("flex gap-3 border-b border-border px-4 py-3 last:border-0", !n.read && "bg-brand-soft/40")}>
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted/70">{timeAgo(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/notifications" className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-brand hover:bg-surface-2">
          View all notifications
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
