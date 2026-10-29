import { BUSINESS_GOALS } from "@/data/defaults";
import { loadCatalogRows } from "@/server/catalog";
import { RulesAdmin } from "./rules-admin";

export const metadata = { title: "Recommendation rules" };

export default async function RulesSettings() {
  const rows = await loadCatalogRows();
  return (
    <RulesAdmin
      rules={rows.rules}
      deps={rows.deps}
      offers={rows.offers.map((o) => ({ id: o.id, name: `${o.number}. ${o.name}` }))}
      items={rows.auditItems.map((i) => ({ id: i.id, label: i.label }))}
      services={rows.services.map((s) => ({ id: s.id, name: s.name }))}
      goals={BUSINESS_GOALS.map((g) => ({ id: g.id, label: g.label }))}
    />
  );
}
