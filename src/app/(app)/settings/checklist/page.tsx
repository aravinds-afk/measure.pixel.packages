import { loadCatalogRows } from "@/server/catalog";
import { ChecklistAdmin } from "./checklist-admin";

export const metadata = { title: "Audit checklist" };

export default async function ChecklistSettings() {
  const rows = await loadCatalogRows();
  return <ChecklistAdmin items={rows.auditItems} categories={rows.categories} services={rows.services.map((s) => ({ id: s.id, name: s.name }))} />;
}
