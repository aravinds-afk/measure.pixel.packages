"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { NAV_GROUPS } from "@/lib/nav";
import { ROLE_LABELS, type ModuleKey } from "@/lib/rbac";
import { cn, initials } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { logoutAction } from "@/actions/auth";

export function Sidebar({
  role,
  allowedModules,
  name,
  email,
  mobileOpen,
  onCloseMobile,
}: {
  role: Role;
  allowedModules: ModuleKey[];
  name: string;
  email: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => allowedModules.includes(i.key as ModuleKey)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-svh flex-col border-r border-border bg-surface transition-all duration-200 lg:sticky lg:top-0 lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {collapsed ? <LogoMark /> : <Logo />}
          <button onClick={onCloseMobile} className="text-muted hover:text-foreground lg:hidden">
            <X className="size-5" />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden text-muted hover:text-foreground lg:block"
          >
            {collapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {groups.map((group, gi) => (
            <div key={gi} className={cn("mb-1", group.label && "mt-4")}>
              {group.label && !collapsed && (
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4.5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link href="/profile" className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {initials(name)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
                <p className="truncate text-xs text-muted">{ROLE_LABELS[role]}</p>
              </div>
            )}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className={cn(
                "mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-danger-soft hover:text-danger transition-colors",
              )}
            >
              <LogOut className="size-4.5" />
              {!collapsed && "Log out"}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
