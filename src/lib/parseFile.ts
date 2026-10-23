import Papa from "papaparse";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  kind: "csv" | "excel";
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Parse an uploaded CSV or Excel (.xlsx) export into header-keyed rows. Runs locally in the browser. */
export async function parseMemberFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_BYTES) throw new Error("File is larger than 5 MB. Split it into smaller files.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = await readSheet(file);
    const [head, ...body] = data;
    if (!head) throw new Error("The spreadsheet is empty.");
    const headers = head.map((h, i) => String(h ?? `Column ${i + 1}`).trim());
    const rows = body
      .filter((r) => r.some((c) => c != null && String(c).trim() !== ""))
      .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] instanceof Date ? (r[i] as Date).toISOString() : r[i] ?? ""])));
    return { headers, rows, kind: "excel" };
  }
  if (name.endsWith(".xls")) throw new Error("Legacy .xls files are not supported. Save the file as .xlsx or .csv and try again.");
  const text = await file.text();
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  if (res.errors.length && !res.data.length) throw new Error(`Could not read CSV: ${res.errors[0].message}`);
  return { headers: res.meta.fields ?? [], rows: res.data, kind: "csv" };
}

/** A fictional sample file in the shape of a typical chapter roster export. */
export const SAMPLE_CSV = [
  "Member ID,First Name,Last Name,Company,Category,Email,Phone,Website,City,Services,Target Market,Industries,Problems Solved,Keywords",
  "SAMPLE-101,Asha,Fernandes,Fernandes Legal (fictional),Business Lawyer,asha.sample@example.com,+91 90000 00101,example.com/fernandes,Chennai,Contracts; Shareholder agreements; Trademark filing,SMEs; Startups,Technology; Manufacturing,Unclear contracts; Partner disputes,contracts; trademark",
  "SAMPLE-102,Ravi,Shankar,Shankar Architects (fictional),Architect,ravi.sample@example.com,+91 90000 00102,,Chennai,Residential design; Factory design; Approvals,Homeowners; Real estate developers,Construction; Real estate,Designing a new building; Approvals,architecture",
  "SAMPLE-103,Meena,Joshi,Joshi Recruiters (fictional),Recruitment,meena.sample@example.com,not-a-phone,,Bengaluru; Chennai,Permanent hiring; Bulk hiring,SMEs; Manufacturers,Manufacturing; Technology,Hard-to-fill roles,recruitment; hiring",
  "SAMPLE-103,Meena,Joshi,Joshi Recruiters (fictional),Recruitment,meena.sample@example.com,,,,,,,,",
  ",,,No Name Company (fictional),Florist,,,,,,,,,",
].join("\n");
