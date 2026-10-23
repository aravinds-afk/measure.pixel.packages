import { useApp } from "../lib/app.tsx";
import { cx } from "./ui.tsx";

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx("pointer-events-auto rounded-xl px-4 py-3 text-sm shadow-lg", t.kind === "error" ? "bg-red-600 text-white" : t.kind === "info" ? "bg-navy-900 text-white" : "bg-emerald-600 text-white")}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
