"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Search, Trash2, Pencil, Download, Check, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, cn } from "@/lib/utils";
import { DOCUMENT_CATEGORIES } from "@/lib/validations/document";
import { deleteDocumentAction, renameDocumentAction } from "@/actions/documents";
import UploadModal from "./upload-modal";

type Doc = { id: string; name: string; category: string; size: number; fileType: string; createdAt: string; customer: { id: string; name: string } | null; uploadedBy: { name: string } | null };
type Customer = { id: string; name: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsClient({ initialDocuments, customers }: { initialDocuments: Doc[]; customers: Customer[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => initialDocuments.filter((d) =>
    (!category || d.category === category) &&
    (!query || [d.name, d.customer?.name].join(" ").toLowerCase().includes(query.toLowerCase()))
  ), [initialDocuments, query, category]);

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteDocumentAction(deleteTarget.id);
      if (!res.ok) { toast({ kind: "error", title: "Could not delete", description: res.error }); return; }
      toast({ kind: "success", title: "Document deleted" });
      setDeleteTarget(null);
      router.refresh();
    });
  }

  function saveRename(id: string) {
    startTransition(async () => {
      const res = await renameDocumentAction(id, renameValue);
      if (!res.ok) { toast({ kind: "error", title: "Could not rename", description: res.error }); return; }
      toast({ kind: "success", title: "Document renamed" });
      setRenamingId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search documents..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44">
            <option value="">All categories</option>
            {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="size-3.5" /> Upload</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Upload your first document to keep records organized." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><FileText className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  {renamingId === d.id ? (
                    <div className="flex items-center gap-1">
                      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-7 text-xs" />
                      <button onClick={() => saveRename(d.id)} className="text-success"><Check className="size-4" /></button>
                      <button onClick={() => setRenamingId(null)} className="text-muted"><X className="size-4" /></button>
                    </div>
                  ) : (
                    <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  )}
                  <p className="text-xs text-muted">{formatSize(d.size)} · {formatDate(d.createdAt)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="neutral">{d.category}</Badge>
                <div className="flex items-center gap-1">
                  <button className="rounded-md p-1.5 text-muted hover:bg-surface-2" title="Download (demo)"><Download className="size-3.5" /></button>
                  <button onClick={() => { setRenamingId(d.id); setRenameValue(d.name); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2"><Pencil className="size-3.5" /></button>
                  <button onClick={() => setDeleteTarget(d)} className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              {d.customer && <p className="mt-2 text-xs text-muted">Linked to <span className={cn("text-foreground")}>{d.customer.name}</span></p>}
            </div>
          ))}
        </div>
      )}

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} customers={customers} onSuccess={() => { setUploadOpen(false); router.refresh(); }} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete document" description={`This will permanently remove ${deleteTarget?.name ?? "this document"}.`} confirmLabel="Delete" danger pending={pending} onConfirm={handleDelete} />
    </div>
  );
}
