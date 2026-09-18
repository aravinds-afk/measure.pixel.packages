"use client";

import { Menu, Moon, Sun, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { GlobalSearch } from "@/components/app-shell/global-search";
import { QuickAdd } from "@/components/app-shell/quick-add";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { useTheme } from "@/components/theme-provider";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

type Notif = { id: string; title: string; message: string; read: boolean; createdAt: string; type: string };

export function Topbar({
  name,
  email,
  role,
  notifications,
  unreadCount,
  onMenuClick,
}: {
  name: string;
  email: string;
  role: Role;
  notifications: Notif[];
  unreadCount: number;
  onMenuClick: () => void;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenuClick} className="text-muted hover:text-foreground lg:hidden">
        <Menu className="size-5" />
      </button>
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1.5">
        <QuickAdd role={role} />
        <button
          onClick={toggleTheme}
          className="flex size-9.5 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </button>
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <Dropdown>
          <DropdownTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg p-1 hover:bg-surface-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {initials(name)}
              </div>
            </button>
          </DropdownTrigger>
          <DropdownContent className="w-56">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-foreground">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
              <p className="mt-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">{ROLE_LABELS[role]}</p>
            </div>
            <DropdownSeparator />
            <DropdownItem asChild><Link href="/profile"><User className="size-4 text-muted" /> Profile</Link></DropdownItem>
            <DropdownItem asChild><Link href="/settings"><Settings className="size-4 text-muted" /> Settings</Link></DropdownItem>
            <DropdownSeparator />
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-danger hover:bg-danger-soft">
                <LogOut className="size-4" /> Log out
              </button>
            </form>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
