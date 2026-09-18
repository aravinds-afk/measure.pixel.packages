"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteCampaignAction } from "@/actions/campaigns";
import CampaignFormModal from "./campaign-form-modal";

type Campaign = {
  id: string; name: string; type: string; status: string; startDate: string; endDate: string | null;
  targetAudience: string | null; budget: number; revenue: number; leadsGenerated: number; conversion: number;
};

export default function MarketingClient({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteCampaignAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Campaign deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: Column<Campaign>[] = [
    { key: "name", header: "Campaign", sortable: true, render: (c) => (<div><p className="font-medium text-foreground">{c.name}</p><p className="text-xs text-muted">{c.type}</p></div>) },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} />, exportValue: (c) => c.status },
    { key: "leadsGenerated", header: "Leads", sortable: true, render: (c) => c.leadsGenerated },
    { key: "conversion", header: "Conversion", render: (c) => `${c.conversion}%` },
    { key: "revenue", header: "Revenue", sortable: true, render: (c) => formatCurrency(c.revenue), exportValue: (c) => String(c.revenue) },
    { key: "startDate", header: "Start", render: (c) => formatDate(c.startDate), hideOnMobile: true },
  ];

  return (
    <div>
      <DataTable
        data={initialCampaigns}
        columns={columns}
        getId={(c) => c.id}
        searchPlaceholder="Search campaigns..."
        searchFn={(c, q) => [c.name, c.type, c.targetAudience].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="campaigns"
        emptyTitle="No campaigns yet"
        emptyDescription="Create a campaign to start generating leads."
        filters={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-3.5" /> New Campaign</Button>}
        rowActions={(c) => (
          <Dropdown>
            <DropdownTrigger asChild><button className="rounded-md p-1.5 hover:bg-surface-2 text-muted"><MoreHorizontal className="size-4" /></button></DropdownTrigger>
            <DropdownContent>
              <DropdownItem onSelect={() => { setEditing(c); setFormOpen(true); }}><Pencil className="size-4 text-muted" /> Edit</DropdownItem>
              <DropdownItem onSelect={() => setDeleteTarget(c)} className="text-danger hover:bg-danger-soft"><Trash2 className="size-4" /> Delete</DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      />

      <CampaignFormModal open={formOpen} onOpenChange={setFormOpen} campaign={editing} onSuccess={() => { setFormOpen(false); router.refresh(); }} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete campaign" description={`This will permanently delete ${deleteTarget?.name ?? "this campaign"}.`} confirmLabel="Delete" danger pending={pending} onConfirm={handleDelete} />
    </div>
  );
}
