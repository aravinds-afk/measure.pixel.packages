import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { buildImportPlan, suggestMapping } from "../supabase/functions/_shared/engine/index.ts";
import { planWrites } from "../supabase/functions/_shared/service.ts";
import { DEMO_MEMBERS } from "../supabase/functions/_shared/demo-data.ts";
import { SAMPLE_CSV } from "../src/lib/parseFile.ts";

const parse = (csv: string) => Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy" });

describe("import pipeline", () => {
  it("auto-maps common export headers", () => {
    const map = suggestMapping(["Member ID", "First Name", "Last Name", "Company", "Category", "E-mail", "Mobile", "Target Market", "Unknown Col"]);
    expect(map["Member ID"]).toBe("externalId");
    expect(map["First Name"]).toBe("firstName");
    expect(map["Category"]).toBe("categoryLabel");
    expect(map["E-mail"]).toBe("email");
    expect(map["Mobile"]).toBe("phone");
    expect(map["Target Market"]).toBe("customerSegments");
    expect(map["Unknown Col"]).toBeNull();
  });

  it("validates rows, detects in-file duplicates and reports missing fields", () => {
    const { data, meta } = parse(SAMPLE_CSV);
    const plan = buildImportPlan(data, suggestMapping(meta.fields!), []);
    expect(plan.totals.rows).toBe(5);
    expect(plan.totals.create).toBe(3);
    expect(plan.totals.duplicates).toBe(1);
    expect(plan.totals.errors).toBe(1); // row without a name
    const meena = plan.rows.find((r) => r.record.externalId === "SAMPLE-103" && r.action === "create")!;
    expect(meena.record.phone).toBeNull(); // invalid phone dropped with a warning
    expect(meena.issues.some((i) => i.field === "phone")).toBe(true);
    expect(meena.record.serviceAreas).toEqual(["Bengaluru", "Chennai"]);
    const asha = plan.rows.find((r) => r.record.externalId === "SAMPLE-101")!;
    expect(asha.record.categoryId).toBe("business_lawyer");
    expect(asha.record.website).toBe("https://example.com/fernandes");
    expect(plan.missingFields.website).toBeGreaterThan(0);
  });

  it("matches existing members by id, then email, and flags name-only matches", () => {
    const existing = [
      { id: "m1", externalId: "X-1", email: null, fullName: "Old Name", company: null },
      { id: "m2", externalId: null, email: "b@example.com", fullName: "B", company: null },
      { id: "m3", externalId: null, email: null, fullName: "Cara Doe", company: "Doe Co" },
    ];
    const rows = [
      { Name: "New Name", "Member ID": "x-1" },
      { Name: "B Person", Email: "B@example.com" },
      { Name: "Cara  Doe", Company: "doe co" },
      { Name: "Fresh Person" },
    ];
    const plan = buildImportPlan(rows, suggestMapping(["Name", "Member ID", "Email", "Company"]), existing);
    expect(plan.rows.map((r) => [r.action, r.matchedOn])).toEqual([
      ["update", "external_id"], ["update", "email"], ["possible_duplicate", "name_company"], ["create", undefined],
    ]);
  });

  it("incremental updates keep member-submitted edits unless overwrite is chosen", () => {
    const member = { ...DEMO_MEMBERS[0], fieldProvenance: { businessDescription: "member_submitted" as const, company: "verified" as const } };
    const rows = [{ "Member ID": member.externalId!, Name: member.fullName, Description: "Imported text", Company: "New Co", Services: "" }];
    const plan = buildImportPlan(rows, suggestMapping(["Member ID", "Name", "Description", "Company", "Services"]), [{ id: member.id, externalId: member.externalId, fullName: member.fullName }]);
    const keep = planWrites(plan, [member]).writes[0];
    expect(keep.kind).toBe("update");
    expect(keep.columns.business_description).toBeUndefined();
    expect(keep.columns.company).toBe("New Co");
    expect(keep.services).toBeUndefined(); // empty cells never wipe existing data
    const over = planWrites(plan, [member], { overwriteMemberSubmitted: true }).writes[0];
    expect(over.columns.business_description).toBe("Imported text");
  });

  it("possible duplicates are skipped unless an admin decides", () => {
    const plan = buildImportPlan([{ Name: "Priya Raman", Company: "BrightFunnel Digital (fictional)" }], { Name: "fullName", Company: "company" }, DEMO_MEMBERS.map((d) => ({ id: d.id, fullName: d.fullName, company: d.company })));
    expect(planWrites(plan, DEMO_MEMBERS).writes).toHaveLength(0);
    const merged = planWrites(plan, DEMO_MEMBERS, { duplicateDecisions: { 2: "merge" } }).writes;
    expect(merged[0].kind).toBe("update");
    expect(merged[0].memberId).toBe(DEMO_MEMBERS[0].id);
  });
});

describe("BNI-style roster columns", () => {
  it("maps profile headings and picks the specific category column", () => {
    const headers = ["First Name", "Last Name", "Company Name", "Profession", "Specialty", "City", "Top Product", "Top Problem Solved", "Ideal Referral", "My Business"];
    const map = suggestMapping(headers);
    expect(map["Top Product"]).toBe("services");
    expect(map["Top Problem Solved"]).toBe("problemsSolved");
    expect(map["My Business"]).toBe("businessDescription");
    const plan = buildImportPlan([{ "First Name": "A", "Last Name": "B", Profession: "Finance & Insurance", Specialty: "Chartered Accountant" }], map, []);
    expect(plan.rows[0].record.categoryId).toBe("chartered_accountant");
    expect(plan.rows[0].record.categoryLabel).toBe("Chartered Accountant");
  });
});
