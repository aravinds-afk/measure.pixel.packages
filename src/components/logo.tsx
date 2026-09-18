import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-mark.png"
      alt="Measure Pixel"
      className={cn("size-8 shrink-0 rounded-lg object-cover shadow-sm", className)}
    />
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText && (
        <span className="text-[16px] font-extrabold tracking-tight text-foreground">
          Measure <span className="font-semibold">Pixel</span>
        </span>
      )}
    </div>
  );
}
