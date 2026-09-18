import Link from "next/link";
import {
  Users, Target, GitBranch, Users2, ClipboardList, BarChart3, ShieldCheck, Lock, KeyRound,
  ArrowRight, CheckCircle2, TrendingUp, Wallet, Handshake,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  { icon: Users, title: "Customer Management", desc: "Centralize every customer profile, contact, deal, invoice and interaction in a single organized record." },
  { icon: Target, title: "Lead Management", desc: "Capture, qualify and route leads automatically so your team never lets an opportunity slip through." },
  { icon: GitBranch, title: "Sales Pipeline", desc: "Visualize every deal stage on a drag-and-drop board and forecast revenue with confidence." },
  { icon: Users2, title: "Team Management", desc: "Assign leads, customers and tasks across your team with clear ownership and accountability." },
  { icon: ClipboardList, title: "Tasks & Follow-ups", desc: "Never miss a call, meeting or deadline with automated reminders and a unified calendar." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Track revenue, conversion and team performance with real-time dashboards and exports." },
];

const ROLES = [
  { title: "Super Admin & Admin", desc: "Full control over the workspace, users, permissions and financials." },
  { title: "Managers", desc: "A live view of team pipeline, performance and workload distribution." },
  { title: "Sales Executives", desc: "Focused workspace for assigned leads, deals, calls and follow-ups." },
  { title: "Customers", desc: "A dedicated portal to track orders, invoices, payments and support." },
];

const SECURITY = [
  { icon: Lock, title: "Encrypted credentials", desc: "Passwords are hashed and sessions are signed, never stored in plain text." },
  { icon: KeyRound, title: "Role-based authorization", desc: "Every route and action is checked against the signed-in user's permissions." },
  { icon: ShieldCheck, title: "Complete audit trail", desc: "Every create, update and login is logged for full accountability." },
];

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-soft/60 to-transparent" />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <Badge tone="brand" className="mx-auto">Measure Pixel CRM</Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Measure Relationships. <span className="text-brand">Grow Your Business.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg">
            A modern CRM platform designed to help businesses manage customers, leads, sales, teams and business relationships from one powerful workspace.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/login" size="lg">Get Started <ArrowRight className="size-4" /></Button>
            <Button href="/login" size="lg" variant="outline">Login</Button>
            <Button href="#insights" size="lg" variant="ghost">Request Demo</Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Everything Your Business Needs</h2>
          <p className="mt-3 text-muted">One platform to run customer relationships end to end, replacing spreadsheets and scattered tools.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-md">
              <div className="flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand"><f.icon className="size-5" /></div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview */}
      <section id="dashboard" className="border-y border-border bg-surface-2/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Powerful CRM Dashboard</h2>
            <p className="mt-3 text-muted">Role-aware dashboards that surface the numbers that matter to every seat on your team.</p>
          </div>
          <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-border bg-surface p-4 shadow-xl sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Customers", value: "1,284", icon: Users, tone: "text-brand bg-brand-soft" },
                { label: "Active Deals", value: "342", icon: Handshake, tone: "text-info bg-info-soft" },
                { label: "Revenue", value: "₹84.2L", icon: Wallet, tone: "text-success bg-success-soft" },
                { label: "Conversion", value: "37%", icon: TrendingUp, tone: "text-warning bg-warning-soft" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-border p-4">
                  <div className={`flex size-8 items-center justify-center rounded-lg ${k.tone}`}><k.icon className="size-4" /></div>
                  <p className="mt-3 text-xl font-semibold text-foreground">{k.value}</p>
                  <p className="text-xs text-muted">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border p-4 sm:col-span-2">
                <p className="text-xs font-medium text-muted mb-3">Sales Overview</p>
                <div className="flex h-32 items-end gap-2">
                  {[40, 55, 35, 70, 60, 85, 65, 95, 80, 100, 90, 110].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-brand/70" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-muted mb-3">Lead Funnel</p>
                <div className="space-y-1.5">
                  {[100, 78, 60, 42, 28, 18].map((w, i) => (
                    <div key={i} className="h-4 rounded bg-brand" style={{ width: `${w}%`, opacity: 1 - i * 0.12 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built for modern teams */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Built for Modern Teams</h2>
            <p className="mt-3 text-muted">
              Role-based access ensures every person on your team — from founders to customer-facing reps — sees exactly what they need, nothing more. Collaborate on the same records without stepping on each other.
            </p>
            <div className="mt-6 space-y-4">
              {ROLES.map((r) => (
                <div key={r.title} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <div><p className="text-sm font-semibold text-foreground">{r.title}</p><p className="text-sm text-muted">{r.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/50 p-8">
            <div className="space-y-3">
              {["Super Admin", "Admin", "Manager", "Sales Executive", "Employee", "Customer"].map((role, i) => (
                <div key={role} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{role}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 6 - i > 0 ? 6 - i : 1 }).map((_, j) => <span key={j} className="size-1.5 rounded-full bg-brand" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Business insights */}
      <section id="insights" className="border-y border-border bg-surface-2/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface p-5"><BarChart3 className="size-6 text-brand" /><p className="mt-3 text-2xl font-semibold text-foreground">98%</p><p className="text-xs text-muted">Report accuracy</p></div>
              <div className="rounded-xl border border-border bg-surface p-5"><TrendingUp className="size-6 text-success" /><p className="mt-3 text-2xl font-semibold text-foreground">+34%</p><p className="text-xs text-muted">Avg. conversion lift</p></div>
              <div className="rounded-xl border border-border bg-surface p-5"><Wallet className="size-6 text-warning" /><p className="mt-3 text-2xl font-semibold text-foreground">₹4.2Cr+</p><p className="text-xs text-muted">Revenue tracked</p></div>
              <div className="rounded-xl border border-border bg-surface p-5"><Users2 className="size-6 text-info" /><p className="mt-3 text-2xl font-semibold text-foreground">500+</p><p className="text-xs text-muted">Teams onboarded</p></div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Business Insights</h2>
              <p className="mt-3 text-muted">Sales, lead, employee and financial reports with date and employee filters — export to CSV whenever you need to share with stakeholders.</p>
              <Button href="/login" className="mt-6">Explore Reports <ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Secure & Scalable</h2>
          <p className="mt-3 text-muted">Enterprise-grade authentication, authorization and audit logging built into the core architecture.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {SECURITY.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-surface p-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand"><s.icon className="size-5" /></div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-14 text-center text-white sm:px-16">
          <h2 className="text-2xl font-semibold sm:text-3xl">Bring Your Customer Relationships Into One Powerful Platform.</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">Join teams already managing their entire customer lifecycle with Measure Pixel.</p>
          <Button href="/login" size="lg" variant="secondary" className="mt-8 bg-white text-indigo-700 hover:bg-indigo-50">Get Started</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
            <div className="col-span-2">
              <Logo />
              <p className="mt-3 max-w-xs text-sm text-muted">A modern CRM platform to manage customers, leads, sales and teams from one workspace.</p>
            </div>
            {[
              { title: "Product", links: ["Features", "Dashboard", "Pricing"] },
              { title: "Solutions", links: ["Sales Teams", "Customer Success", "Marketing"] },
              { title: "Resources", links: ["Support", "Privacy Policy", "Terms of Service"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-foreground">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><Link href="/login" className="text-sm text-muted hover:text-foreground">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} Measure Pixel. All rights reserved.</p>
            <p>Measure Relationships. Grow Your Business.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
