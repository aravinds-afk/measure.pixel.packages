import { loadCatalogRows } from "@/server/catalog";
import { CatalogueAdmin } from "./catalogue-admin";

export const metadata = { title: "Catalogue settings" };

export default async function CatalogueSettings() {
  const rows = await loadCatalogRows();
  return <CatalogueAdmin services={rows.services} offers={rows.offers} industries={rows.industries} links={rows.links} clusters={rows.clusters} />;
}
