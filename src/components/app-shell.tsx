"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cx, Wordmark } from "./ui";
import { ToastProvider } from "./toast";

const NAV = [
  { href: "/audits/new", match: /^\/audits/, label: "New Audit", short: "Audit", icon: IconAudit },
  { href: "/catalogue", match: /^\/catalogue/, label: "Opportunities", short: "Catalogue", icon: IconGrid },
  { href: "/quotes", match: /^\/quotes/, label: "Quotations", short: "Quotes", icon: IconDoc },
  { href: "/clients", match: /^\/clients/, label: "Clients", short: "Clients", icon: IconPeople },
  { href: "/dashboard", match: /^\/dashboard/, label: "Revenue", short: "Revenue", icon: IconChart },
];

export function AppShell({ user, children }: { user: { name: string; role: string }; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };
  return (
    <ToastProvider>
      <div className="min-h-dvh lg:pl-[232px]">
        {/* Desktop sidebar */}
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
          <Link href="/audits/new" className="mb-8 px-2"><Wordmark /></Link>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={n.match.test(path) ? "page" : undefined}
                className={cx("flex min-h-[40px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium", n.match.test(path) ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                <n.icon /> {n.label}
              </Link>
            ))}
            <Link href="/settings" aria-current={path.startsWith("/settings") ? "page" : undefined}
              className={cx("flex min-h-[40px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium", path.startsWith("/settings") ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
              <IconCog /> Settings
            </Link>
          </nav>
          <div className="border-t border-border px-2 pt-4 text-[13px]">
            <p className="font-medium">{user.name}</p>
            <p className="text-ink-3 capitalize">{user.role}</p>
            <button onClick={logout} className="mt-2 text-ink-2 underline-offset-2 hover:underline">Sign out</button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur lg:hidden">
          <Link href="/audits/new" aria-label="Home"><Wordmark /></Link>
          <Link href="/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"><IconCog /></Link>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>

        {/* Mobile tab bar */}
        <nav aria-label="Main" className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.match.test(path) ? "page" : undefined}
              className={cx("flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium", n.match.test(path) ? "text-ink" : "text-ink-3")}>
              <n.icon />
              {n.short}
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function IconAudit() { return <Svg><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>; }
function IconGrid() { return <Svg><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></Svg>; }
function IconDoc() { return <Svg><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></Svg>; }
function IconPeople() { return <Svg><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.6c1.4.6 2.3 2 2.6 4.4" /></Svg>; }
function IconChart() { return <Svg><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>; }
function IconCog() { return <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.6 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.7 13.9H3.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 7.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V3.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></Svg>; }
