"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, User, ShoppingBag, Receipt, Wallet, FileText, LifeBuoy, Bell, LogOut, Menu, X } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { cn, initials } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";

const NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/orders", label: "Orders & Deals", icon: ShoppingBag },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/payments", label: "Payments", icon: Wallet },
  { href: "/portal/documents", label: "Documents", icon: FileText },
  { href: "/portal/support", label: "Support", icon: LifeBuoy },
  { href: "/portal/notifications", label: "Notifications", icon: Bell },
  { href: "/portal/profile", label: "Profile", icon: User },
];

export function PortalShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-svh w-full">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-svh w-64 flex-col border-r border-border bg-surface transition-transform lg:sticky lg:top-0 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Logo />
          <button onClick={() => setMobileOpen(false)} className="text-muted hover:text-foreground lg:hidden"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors", active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground")}>
                <item.icon className="size-4.5" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-1.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials(name)}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{name}</p><p className="truncate text-xs text-muted">Customer</p></div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-danger-soft hover:text-danger">
              <LogOut className="size-4.5" /> Log out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-foreground lg:hidden"><Menu className="size-5" /></button>
          <LogoMark className="lg:hidden" />
          <div className="flex-1" />
          <button onClick={toggleTheme} className="flex size-9.5 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground">
            {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </button>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
