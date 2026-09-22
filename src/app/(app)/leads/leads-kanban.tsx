"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { updateLeadStatusAction } from "@/actions/leads";
import { LEAD_STATUSES } from "@/lib/validations/lead";
import { useToast } from "@/components/ui/toast";
import type { LeadStatus } from "@prisma/client";

type Lead = {
  id: string; name: string; company: string | null; value: number; status: string; priority: string;
  assignedTo: { id: string; name: string } | null;
};

const COLUMN_LABEL: Record<string, string> = {
  NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation", WON: "Won", LOST: "Lost",
};

export default function LeadsKanban({ leads, onOpenLead }: { leads: Lead[]; onOpenLead: (lead: Lead) => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  function handleDrop(status: string) {
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    if (!lead || lead.status === status) { setDragId(null); setOverCol(null); return; }
    startTransition(async () => {
      const res = await updateLeadStatusAction(dragId, status as LeadStatus);
      if (!res.ok) toast({ kind: "error", title: "Could not update lead", description: res.error });
      else { toast({ kind: "success", title: `Moved to ${COLUMN_LABEL[status]}` }); router.refresh(); }
    });
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {LEAD_STATUSES.map((status) => {
        const items = leads.filter((l) => l.status === status);
        return (
          <div
            key={status}
            className={cn("w-72 shrink-0 rounded-xl border border-border bg-surface-2/40 p-3", overCol === status && "ring-2 ring-brand")}
            onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={() => handleDrop(status)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-foreground">{COLUMN_LABEL[status]}</p>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{items.length}</span>
            </div>
            <div className="space-y-2.5 min-h-[60px]">
              {items.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  onClick={() => onOpenLead(lead)}
                  className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <MoreHorizontal className="size-4 shrink-0 text-muted" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{lead.company ?? "—"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand">{formatCurrency(lead.value)}</span>
                    <StatusBadge status={lead.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="text-[11px] text-muted">{lead.assignedTo?.name ?? "Unassigned"}</span>
                    <div className="flex gap-1.5 text-muted">
                      <Phone className="size-3.5" />
                      <Mail className="size-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
