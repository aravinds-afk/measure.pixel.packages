import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-90 shadow-sm",
  secondary: "bg-surface-2 text-foreground hover:bg-border/60",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
  link: "text-brand underline-offset-4 hover:underline",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9.5 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9 shrink-0",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AnchorProps = BaseProps &
  Omit<React.ComponentProps<typeof Link>, "href"> & { href: string };

export function Button(props: ButtonProps | AnchorProps) {
  const { variant = "primary", size = "md", loading, className, children, ...rest } = props;
  const classes = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as AnchorProps;
    const anchorProps = linkRest as unknown as Omit<React.ComponentProps<typeof Link>, "href">;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </Link>
    );
  }

  const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} disabled={loading || buttonRest.disabled} {...buttonRest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
