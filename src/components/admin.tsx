"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { useToast } from "./toast";

/** Save helper for admin editors: posts to /api/admin/[entity] and refreshes server data. */
export function useAdminSave(entity: string) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (body: { action: "upsert" | "reset"; item?: unknown; id?: string }, okText = "Saved") => {
    setBusy(true);
    try {
      await api(`/api/admin/${entity}`, { body });
      toast("ok", okText);
      router.refresh();
      return true;
    } catch (e) {
      toast("danger", (e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, save: (item: unknown, okText?: string) => run({ action: "upsert", item }, okText), reset: (id: string) => run({ action: "reset", id }, "Restored to Opportunity Board values") };
}

export function MultiSelect({ options, value, onChange, label, size = 6 }: { options: { value: string; label: string; group?: string }[]; value: string[]; onChange: (v: string[]) => void; label: string; size?: number }) {
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <select multiple aria-label={label} size={size} className="field min-h-[120px]" value={value} onChange={(e) => onChange([...e.target.selectedOptions].map((o) => o.value))}>
      {groups.map((g) =>
        g ? (
          <optgroup key={g} label={g}>{options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
        ) : (
          options.filter((o) => !o.group).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
        ),
      )}
    </select>
  );
}
