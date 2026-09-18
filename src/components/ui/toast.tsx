"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; title: string; description?: string; kind: ToastKind };

const ToastContext = createContext<{
  toast: (t: Omit<ToastItem, "id">) => void;
}>({ toast: () => {} });

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-success shrink-0" />,
  error: <XCircle className="size-5 text-danger shrink-0" />,
  info: <Info className="size-5 text-info shrink-0" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "animate-mp-fade-in flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-lg"
            )}
          >
            {ICONS[item.kind]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted">{item.description}</p>
              )}
            </div>
            <button onClick={() => dismiss(item.id)} className="text-muted hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
