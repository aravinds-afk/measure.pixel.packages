"use client";

import { useState, useTransition } from "react";
import { UploadCloud, File as FileIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select, Label, HelpText } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { DOCUMENT_CATEGORIES } from "@/lib/validations/document";
import { uploadDocumentAction } from "@/actions/documents";
import { cn } from "@/lib/utils";

type Customer = { id: string; name: string };

export default function UploadModal({
  open, onOpenChange, customers, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; customers: Customer[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("INTERNAL");
  const [customerId, setCustomerId] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function handleUpload() {
    if (!file) { toast({ kind: "error", title: "Choose a file first" }); return; }
    startTransition(async () => {
      const res = await uploadDocumentAction({
        name: file.name, category, customerId: customerId || undefined, size: file.size, fileType: file.name.split(".").pop() ?? "file",
      });
      if (!res.ok) { toast({ kind: "error", title: "Could not upload document", description: res.error }); return; }
      toast({ kind: "success", title: "Document uploaded" });
      setFile(null);
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload document"
      description="Files are stored as metadata in this demo environment."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending || !file} onClick={handleUpload}>Upload</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
          className={cn("flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center", dragOver ? "border-brand bg-brand-soft" : "border-border")}
        >
          {file ? (
            <>
              <FileIcon className="size-8 text-brand" />
              <p className="mt-2 text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <UploadCloud className="size-8 text-muted" />
              <p className="mt-2 text-sm text-foreground">Drag and drop a file here</p>
              <HelpText>or</HelpText>
            </>
          )}
          <label className="mt-3 cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2">
            Browse files
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>{DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </div>
          <div>
            <Label>Link to customer</Label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
