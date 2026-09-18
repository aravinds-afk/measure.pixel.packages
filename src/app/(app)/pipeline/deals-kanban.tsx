"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { updateDealStageAction } from "@/actions/deals";
import { DEAL_STAGES } from "@/lib/validations/deal";
import { useToast } from "@/components/ui/toast";
import type { DealStage } from "@prisma/client";

type Deal = {
  id: string; name: string; value: number; probability: number; stage: string;
  customer: { id: string; name: string } | null; assignedTo: { id: string; name: string } | null;
};

export default function DealsKanban({ deals }: { deals: Deal[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  function handleDrop(stage: string) {
    if (!dragId) return;
    const deal = deals.find((d) => d.id === dragId);
    if (!deal || deal.stage === stage) { setDragId(null); setOverCol(null); return; }
    startTransition(async () => {
      const res = await updateDealStageAction(dragId, stage as DealStage);
      if (!res.ok) toast({ kind: "error", title: "Could not update deal", description: res.error });
      else { toast({ kind: "success", title: `Moved to ${stage}` }); router.refresh(); }
    });
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {DEAL_STAGES.map((stage) => {
        const items = deals.filter((d) => d.stage === stage);
        const total = items.reduce((s, d) => s + d.value, 0);
        return (
          <div
            key={stage}
            className={cn("w-72 shrink-0 rounded-xl border border-border bg-surface-2/40 p-3", overCol === stage && "ring-2 ring-brand")}
            onDragOver={(e) => { e.preventDefault(); setOverCol(stage); }}
            onDragLeave={() => setOverCol((c) => (c === stage ? null : c))}
            onDrop={() => handleDrop(stage)}
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-foreground">{stage}</p>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{items.length}</span>
            </div>
            <p className="mb-3 px-1 text-xs text-muted">{formatCurrency(total)}</p>
            <div className="space-y-2.5 min-h-[60px]">
              {items.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={() => setDragId(deal.id)}
                  onClick={() => router.push(`/deals/${deal.id}`)}
                  className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{deal.name}</p>
                    <MoreHorizontal className="size-4 shrink-0 text-muted" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{deal.customer?.name ?? "—"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand">{formatCurrency(deal.value)}</span>
                    <StatusBadge status={`${deal.probability}%`} />
                  </div>
                  <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted">{deal.assignedTo?.name ?? "Unassigned"}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
