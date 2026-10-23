import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import {
  AlertTriangle, Briefcase, Building2, Calculator, CalendarHeart, Camera, Check, Code2, Copy, FlaskConical, Gift, HardHat, HeartPulse, Home, Info,
  KeyRound, Landmark, LineChart, Loader2, Lock, Megaphone, Package, PiggyBank, Plane, Printer, Ruler, Scale, Server, ShieldCheck, Sofa, Sparkles,
  Sun, Target, TrendingUp, Truck, UserPlus, Users, UtensilsCrossed, X, Zap, type LucideIcon,
} from "lucide-react";
import { getCategory, type MemberProfile, type OpportunityConfidence, type Provenance } from "@engine/index.ts";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const ICONS: Record<string, LucideIcon> = {
  Megaphone, Code2, Calculator, LineChart, Scale, Users, UserPlus, Landmark, ShieldCheck, Building2, Home, KeyRound, Ruler, Sofa, HardHat, Zap, Sun,
  Server, Lock, Printer, Gift, CalendarHeart, Camera, PiggyBank, HeartPulse, Plane, Target, TrendingUp, Sparkles, Truck, UtensilsCrossed, Package,
};

export function CategoryIcon({ categoryId, className = "h-4 w-4" }: { categoryId?: string | null; className?: string }) {
  const Icon = ICONS[getCategory(categoryId)?.icon ?? ""] ?? Briefcase;
  return <Icon className={className} aria-hidden />;
}

export function categoryName(m: Pick<MemberProfile, "categoryId" | "categoryLabel"> | undefined): string {
  if (!m) return "";
  return getCategory(m.categoryId)?.name ?? m.categoryLabel ?? "Uncategorised";
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "primary", size = "md", loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm",
    secondary: "bg-white text-navy-900 border border-slate-200 hover:bg-slate-50 shadow-sm",
    ghost: "text-navy-800 hover:bg-navy-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        styles[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,38,74,0.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 text-navy-700">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-navy-950">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-navy-950 sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

type Tone = "slate" | "blue" | "green" | "amber" | "red" | "navy" | "violet";
export function Badge({ tone = "slate", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  const tones: Record<Tone, string> = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    navy: "bg-navy-900 text-white",
    violet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  };
  return <span title={title} className={cx("inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function ConfidenceBadge({ level }: { level: "High" | "Medium" | "Low" | OpportunityConfidence }) {
  const tone: Tone = level === "High" ? "green" : level === "Medium" ? "blue" : level === "Low" ? "amber" : "violet";
  return <Badge tone={tone} title="Confidence reflects how complete the underlying data is.">{level === "Exploratory" ? "Exploratory" : `${level} confidence`}</Badge>;
}

export function ProvenanceBadge({ provenance }: { provenance?: Provenance }) {
  if (!provenance) return null;
  const map: Record<Provenance, [Tone, string, string]> = {
    verified: ["green", "Verified", "From an official export or confirmed by a chapter admin."],
    member_submitted: ["blue", "Member-submitted", "Entered by the member on their own profile."],
    ai_suggested: ["violet", "AI suggestion", "Suggested automatically — not confirmed by the member."],
  };
  const [tone, label, title] = map[provenance];
  return <Badge tone={tone} title={title}>{label}</Badge>;
}

export function Avatar({ member, size = 40 }: { member?: Pick<MemberProfile, "fullName" | "photoUrl" | "categoryId">; size?: number }) {
  const initials = (member?.fullName ?? "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [broken, setBroken] = useState(false);
  if (member?.photoUrl && !broken) {
    return <img src={member.photoUrl} alt="" onError={() => setBroken(true)} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />;
  }
  const hues = ["#1c3a6e", "#2563eb", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#0369a1"];
  const h = hues[[...(member?.fullName ?? "")].reduce((s, c) => s + c.charCodeAt(0), 0) % hues.length];
  return (
    <div aria-hidden className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white" style={{ width: size, height: size, background: h, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export function scoreColor(score: number): string {
  if (score >= 90) return "#1d4ed8";
  if (score >= 75) return "#2563eb";
  if (score >= 60) return "#0891b2";
  if (score >= 40) return "#d97706";
  return "#94a3b8";
}

export function ScoreRing({ score, size = 120, stroke = 10, label }: { score: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(score), 30);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Compatibility score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8edf5" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * shown) / 100} style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display font-extrabold text-navy-950" style={{ fontSize: size * 0.3 }}>{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label ?? "/ 100"}</span>
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  return (
    <span className="inline-flex min-w-[42px] items-center justify-center rounded-lg px-2 py-1 text-sm font-bold text-white" style={{ background: scoreColor(score) }}>
      {score}
    </span>
  );
}

export function Bar({ value, max = 100, color }: { value: number | null; max?: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      {value != null && <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color ?? scoreColor(value) }} />}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-[84px]", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "pr-8", props.className)} />;
}

/** Comma/semicolon separated list editor. */
export function ListInput({ value, onChange, placeholder, id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; id?: string }) {
  const [text, setText] = useState(value.join("; "));
  useEffect(() => setText(value.join("; ")), [value]);
  return (
    <Input
      id={id}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(text.split(/[;,\n]+/).map((s) => s.trim()).filter(Boolean))}
    />
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{message}</span>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={cx("flex items-start gap-2 rounded-xl border px-4 py-3 text-sm", tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-100 bg-blue-50/60 text-navy-900")}>
      {tone === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-full bg-navy-50 p-3 text-navy-700">{icon}</div>}
      <h3 className="font-semibold text-navy-950">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="font-semibold text-navy-950">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode }[] }) {
  return (
    <div className="no-print -mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition", value === t.value ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-white hover:text-navy-900")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Copied" : label}
    </Button>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="violet" title="All people and companies in demo mode are fictional.">
      <FlaskConical className="h-3 w-3" aria-hidden /> Demo data
    </Badge>
  );
}

export function MemberChip({ member, sub }: { member?: MemberProfile; sub?: ReactNode }) {
  if (!member) return <span className="text-sm text-slate-400">Unknown member</span>;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar member={member} size={34} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-navy-950">{member.fullName}</div>
        <div className="flex items-center gap-1 truncate text-xs text-slate-500">
          <CategoryIcon categoryId={member.categoryId} className="h-3 w-3 shrink-0" /> <span className="truncate">{sub ?? categoryName(member)}</span>
        </div>
      </div>
    </div>
  );
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
