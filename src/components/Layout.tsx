import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity, BarChart3, Bookmark, CalendarCheck, Compass, GitCompare, LayoutDashboard, LogOut, Menu, Network, Search, Settings, Upload, UserCog, Users, X,
} from "lucide-react";
import { useApp } from "../lib/app.tsx";
import { Avatar, cx, DemoBadge } from "./ui.tsx";

interface Item { to: string; label: string; icon: typeof Users; show?: (r: { isAdmin: boolean; isLeader: boolean }) => boolean }
const NAV: { section: string; items: Item[] }[] = [
  { section: "Discover", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/members", label: "Member directory", icon: Users },
    { to: "/compatibility", label: "Compatibility", icon: GitCompare },
    { to: "/spheres", label: "Contact spheres", icon: Network },
    { to: "/find", label: "Referral finder", icon: Compass },
  ] },
  { section: "Relationships", items: [
    { to: "/meetings", label: "One-to-one planner", icon: CalendarCheck },
    { to: "/saved", label: "Saved connections", icon: Bookmark },
    { to: "/referrals", label: "Referral tracker", icon: Activity },
  ] },
  { section: "Leadership", items: [
    { to: "/analytics", label: "Chapter analytics", icon: BarChart3, show: (r) => r.isLeader },
    { to: "/admin/members", label: "Member management", icon: UserCog, show: (r) => r.isAdmin },
    { to: "/admin/import", label: "Import & sync", icon: Upload, show: (r) => r.isAdmin },
  ] },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#fff" fillOpacity=".08" /><circle cx="12" cy="16" r="6" fill="none" stroke="#60A5FA" strokeWidth="2.5" /><circle cx="20" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.5" /></svg>
      <div>
        <div className="font-display text-[15px] font-bold leading-tight text-white">ConnectSphere</div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-navy-300">Referral intelligence</div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { session, me, backend, isAdmin, isLeader } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main">
      {NAV.map((g) => {
        const items = g.items.filter((i) => !i.show || i.show({ isAdmin, isLeader }));
        if (!items.length) return null;
        return (
          <div key={g.section}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300/80">{g.section}</div>
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cx("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition", isActive ? "bg-white/10 font-medium text-white" : "text-navy-200 hover:bg-white/5 hover:text-white")}
              >
                <i.icon className="h-4 w-4" aria-hidden /> {i.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="border-t border-white/10 p-3">
      <NavLink to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
        <Avatar member={me ?? { fullName: session?.email ?? "?", photoUrl: null, categoryId: null }} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{me?.fullName ?? session?.email}</div>
          <div className="truncate text-[11px] capitalize text-navy-300">{session?.role} · {session?.chapterName}</div>
        </div>
        <Settings className="h-4 w-4 text-navy-300" aria-label="Privacy and account settings" />
      </NavLink>
      <button onClick={() => backend.signOut()} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-white/5 hover:text-white">
        <LogOut className="h-4 w-4" aria-hidden /> Sign out
      </button>
    </div>
  );
  return (
    <div className="flex min-h-full">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-950 lg:flex">
        <div className="px-5 pt-5"><Brand /></div>
        {nav}
        {footer}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-navy-950/50" />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-950" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded p-1 text-navy-200" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg p-1.5 text-navy-900 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1 truncate text-sm text-slate-500">
            <span className="font-medium text-navy-900">{session?.chapterName}</span>
          </div>
          {session?.isDemo && <DemoBadge />}
          <NavLink to="/members" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Search members"><Search className="h-5 w-5" /></NavLink>
        </header>
        {session?.isDemo && loc.pathname === "/" && (
          <div className="no-print border-b border-violet-200 bg-violet-50 px-4 py-2 text-center text-xs text-violet-900 lg:px-8">
            Demo mode — every member, company and referral shown is fictional. Nothing you do here leaves this browser.
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="no-print px-4 pb-6 text-center text-[11px] text-slate-400 lg:px-8">
          ConnectSphere is an independent tool and is not affiliated with or endorsed by BNI. Compatibility scores indicate potential, not guaranteed business.
        </footer>
      </div>
    </div>
  );
}
