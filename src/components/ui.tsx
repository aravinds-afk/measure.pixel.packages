import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

export const cx = clsx;

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-black disabled:bg-ink-3",
  accent: "bg-accent text-ink hover:brightness-95 disabled:opacity-50",
  secondary: "bg-surface text-ink border border-border hover:border-border-strong disabled:text-ink-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-surface text-danger border border-border hover:border-danger",
};

export function buttonClass(variant: Variant = "primary", size: "md" | "sm" | "lg" = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors disabled:cursor-not-allowed select-none whitespace-nowrap",
    size === "lg" && "min-h-[52px] px-6 text-[16px]",
    size === "md" && "min-h-[44px] px-4 text-[15px]",
    size === "sm" && "min-h-[36px] px-3 text-[14px]",
    variants[variant],
    extra,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" | "lg"; loading?: boolean }>(
  function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
    return (
      <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: "md" | "sm" | "lg"; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export function Card({ className, children, as: As = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" }) {
  return <As className={cx("card", className)}>{children}</As>;
}

export function Field({ label, hint, error, children, className, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-ink-3">{hint}</p>}
      {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx("field", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx("field", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx("field appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2355554f' stroke-width='1.6' fill='none'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
}

type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "accent" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-ink",
  dark: "bg-ink text-white",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium leading-5", tones[tone], className)}>{children}</span>;
}

export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; size?: "md" | "sm" }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[10px] bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-[8px] px-3 font-medium transition-colors",
            size === "md" ? "min-h-[36px] text-[14px]" : "min-h-[30px] text-[13px]",
            value === o.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-[16px] font-medium">{title}</p>
      {body && <p className="max-w-md text-[14px] text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "danger" | "ok"; title?: string; children: ReactNode }) {
  const t = { info: "border-info/25 bg-info-soft", warn: "border-warn/25 bg-warn-soft", danger: "border-danger/25 bg-danger-soft", ok: "border-ok/25 bg-ok-soft" }[tone];
  return (
    <div className={cx("rounded-[12px] border px-4 py-3 text-[14px]", t)} role={tone === "danger" ? "alert" : "status"}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function Wordmark({ inverted }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="h-3.5 w-3.5 rounded-[3px] bg-accent" />
      <span className={cx("text-[12px] font-semibold tracking-[0.2em]", inverted ? "text-white" : "text-ink")}>MEASURE PIXEL</span>
    </span>
  );
}
