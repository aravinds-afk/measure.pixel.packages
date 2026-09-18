"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string;
  hideOnMobile?: boolean;
};

export function DataTable<T>({
  data,
  columns,
  getId,
  searchPlaceholder = "Search...",
  searchFn,
  filters,
  rowActions,
  bulkActions,
  emptyTitle = "No records yet",
  emptyDescription = "Data will appear here once available.",
  onRowClick,
  exportName = "export",
}: {
  data: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  filters?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  bulkActions?: (selected: T[]) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  exportName?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(columns.map((c) => c.key)));

  const filtered = useMemo(() => {
    if (!query) return data;
    return data.filter((row) => (searchFn ? searchFn(row, query) : JSON.stringify(row).toLowerCase().includes(query.toLowerCase())));
  }, [data, query, searchFn]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (col.exportValue?.(a) ?? String(col.render(a))).toString();
      const bv = (col.exportValue?.(b) ?? String(col.render(b))).toString();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);
  const activeColumns = columns.filter((c) => visibleCols.has(c.key));

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelectAll() {
    if (selected.size === pageData.length && pageData.length > 0) setSelected(new Set());
    else setSelected(new Set(pageData.map(getId)));
  }

  function toggleSelectRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const cols = activeColumns;
    const header = cols.map((c) => c.header).join(",");
    const rows = sorted.map((row) =>
      cols.map((c) => `"${(c.exportValue?.(row) ?? String(c.render(row))).toString().replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedRows = pageData.filter((r) => selected.has(getId(r)));

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          {filters}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && bulkActions && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand">
              {selected.size} selected {bulkActions(selectedRows)}
            </div>
          )}
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="outline" size="sm"><SlidersHorizontal className="size-3.5" /> Columns</Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLabel>Toggle columns</DropdownLabel>
              <DropdownSeparator />
              {columns.map((c) => (
                <DropdownItem key={c.key} onSelect={(e) => {
                  e.preventDefault();
                  setVisibleCols((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.key)) next.delete(c.key);
                    else next.add(c.key);
                    return next;
                  });
                }}>
                  <input type="checkbox" readOnly checked={visibleCols.has(c.key)} className="size-3.5 accent-[var(--brand)]" />
                  {c.header}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-3.5" /> Export</Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  {bulkActions && (
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" className="size-3.5 accent-[var(--brand)]" checked={pageData.length > 0 && selected.size === pageData.length} onChange={toggleSelectAll} />
                    </th>
                  )}
                  {activeColumns.map((c) => (
                    <th key={c.key} className={cn("px-4 py-3 font-medium", c.className)}>
                      {c.sortable ? (
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                          {c.header} <ChevronsUpDown className="size-3" />
                        </button>
                      ) : c.header}
                    </th>
                  ))}
                  {rowActions && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageData.map((row) => {
                  const id = getId(row);
                  return (
                    <tr
                      key={id}
                      className={cn("transition-colors hover:bg-surface-2/50", onRowClick && "cursor-pointer")}
                      onClick={() => onRowClick?.(row)}
                    >
                      {bulkActions && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="size-3.5 accent-[var(--brand)]" checked={selected.has(id)} onChange={() => toggleSelectRow(id)} />
                        </td>
                      )}
                      {activeColumns.map((c) => (
                        <td key={c.key} className={cn("px-4 py-3 align-middle text-foreground", c.className)}>{c.render(row)}</td>
                      ))}
                      {rowActions && (
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {rowActions(row)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {pageData.map((row) => {
              const id = getId(row);
              return (
                <div key={id} className="rounded-xl border border-border bg-surface p-4" onClick={() => onRowClick?.(row)}>
                  {activeColumns.filter((c) => !c.hideOnMobile).map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-3 py-1 text-sm">
                      <span className="text-xs text-muted">{c.header}</span>
                      <span className="text-foreground text-right">{c.render(row)}</span>
                    </div>
                  ))}
                  {rowActions && <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-2 text-xs text-muted">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
