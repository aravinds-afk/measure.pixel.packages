import type { SheetsApi } from "@/server/sheets/sync";

/** In-memory imitation of the subset of the Sheets API the sync layer uses. */
export function fakeSheets(opts: { failOnce?: RegExp } = {}) {
  const tabs = new Map<string, { id: number; rows: (string | number | boolean)[][] }>();
  let nextId = 1;
  let failArmed = !!opts.failOnce;
  const calls: string[] = [];
  const tabOf = (range: string) => {
    const m = decodeURIComponent(range).match(/^'((?:[^']|'')+)'!/);
    return m ? m[1].replace(/''/g, "'") : "";
  };
  const rowNum = (range: string) => Number(decodeURIComponent(range).match(/!A(\d+)/)?.[1] ?? 1);

  const api: SheetsApi = async <T,>(path: string, init: { method?: string; body?: unknown } = {}) => {
    calls.push(`${init.method ?? "GET"} ${path}`);
    if (failArmed && opts.failOnce!.test(path)) {
      failArmed = false;
      throw new Error("Simulated Google outage");
    }
    const body = init.body as Record<string, unknown> | undefined;
    if (path.startsWith("?fields=")) {
      return { sheets: [...tabs.entries()].map(([title, t]) => ({ properties: { sheetId: t.id, title } })) } as T;
    }
    if (path === ":batchUpdate") {
      const replies: unknown[] = [];
      for (const r of (body!.requests as Record<string, any>[])) {
        if (r.addSheet) {
          const title = r.addSheet.properties.title;
          tabs.set(title, { id: nextId++, rows: [] });
          replies.push({ addSheet: { properties: { sheetId: tabs.get(title)!.id, title } } });
        } else if (r.deleteDimension) {
          const t = [...tabs.values()].find((x) => x.id === r.deleteDimension.range.sheetId)!;
          t.rows.splice(r.deleteDimension.range.startIndex, 1);
          replies.push({});
        }
      }
      return { replies } as T;
    }
    if (path.startsWith("/values:batchGet")) {
      const ranges = new URLSearchParams(path.split("?")[1]).getAll("ranges");
      return { valueRanges: ranges.map((r) => ({ values: tabs.get(tabOf(r))?.rows[0] ? [tabs.get(tabOf(r))!.rows[0].map(String)] : undefined })) } as T;
    }
    if (path === "/values:batchUpdate") {
      for (const d of body!.data as { range: string; values: unknown[][] }[]) {
        const t = tabs.get(tabOf(d.range))!;
        const n = rowNum(d.range);
        while (t.rows.length < n) t.rows.push([]);
        t.rows[n - 1] = d.values[0] as (string | number)[];
      }
      return {} as T;
    }
    if (path.includes(":append")) {
      const t = tabs.get(tabOf(path.split(":append")[0].replace("/values/", "")))!;
      t.rows.push(...(body!.values as (string | number)[][]));
      return {} as T;
    }
    if (path.startsWith("/values/")) {
      const t = tabs.get(tabOf(path.replace("/values/", "").split("?")[0]));
      return { values: t ? t.rows.slice(1) : [] } as T;
    }
    throw new Error(`fake sheets: unhandled ${path}`);
  };
  return { api, tabs, calls };
}
