"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Select, Label } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

type Activity = { id: string; action: string; module: string; description: string; createdAt: string; user: { id: string; name: string } | null };

export default function ActivityClient({ initialActivities }: { initialActivities: Activity[] }) {
  const [moduleFilter, setModuleFilter] = useState("");
  const modules = useMemo(() => Array.from(new Set(initialActivities.map((a) => a.module))).sort(), [initialActivities]);
  const filtered = moduleFilter ? initialActivities.filter((a) => a.module === moduleFilter) : initialActivities;

  const columns: Column<Activity>[] = [
    { key: "user", header: "User", render: (a) => a.user?.name ?? "System", exportValue: (a) => a.user?.name ?? "System" },
    { key: "action", header: "Action", render: (a) => <Badge tone="brand">{a.action}</Badge>, exportValue: (a) => a.action },
    { key: "module", header: "Module", sortable: true, render: (a) => a.module },
    { key: "description", header: "Description", render: (a) => a.description },
    { key: "createdAt", header: "Date/Time", sortable: true, render: (a) => formatDateTime(a.createdAt) },
  ];

  return (
    <div>
      <div className="mb-3">
        <Label>Filter by module</Label>
        <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="w-56">
          <option value="">All modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        getId={(a) => a.id}
        searchPlaceholder="Search activity..."
        searchFn={(a, q) => [a.user?.name, a.action, a.module, a.description].join(" ").toLowerCase().includes(q.toLowerCase())}
        exportName="activity-log"
        emptyTitle="No activity recorded"
      />
    </div>
  );
}
