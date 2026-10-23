import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MemberProfile } from "@engine/index.ts";
import { tokens } from "@engine/index.ts";
import { Avatar, categoryName, cx, Input } from "./ui.tsx";

export function MemberPicker({ members, value, onChange, exclude, label }: { members: MemberProfile[]; value: string | null; onChange: (id: string) => void; exclude?: string | null; label: string }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const qt = tokens(q);
    return members
      .filter((m) => m.status === "active" && m.id !== exclude)
      .filter((m) => !qt.length || qt.every((t) => tokens(`${m.fullName} ${m.company ?? ""} ${categoryName(m)}`).some((x) => x.startsWith(t))))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [members, q, exclude]);
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input aria-label={`Search ${label}`} placeholder="Search members" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1" role="listbox" aria-label={label}>
        {list.map((m) => (
          <li key={m.id}>
            <button
              role="option"
              aria-selected={value === m.id}
              onClick={() => onChange(m.id)}
              className={cx("flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition", value === m.id ? "border-blue-400 bg-blue-50" : "border-transparent hover:bg-slate-50")}
            >
              <Avatar member={m} size={32} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-navy-950">{m.fullName}</div>
                <div className="truncate text-xs text-slate-500">{categoryName(m)}</div>
              </div>
            </button>
          </li>
        ))}
        {!list.length && <li className="px-3 py-4 text-sm text-slate-500">No members found.</li>}
      </ul>
    </div>
  );
}
