import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-sm",
        className
      )}
    >
      MP
    </div>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Measure Pixel
        </span>
      )}
    </div>
  );
}
