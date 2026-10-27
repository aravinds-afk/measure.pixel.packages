import { getDb } from "../src/server/db";
import { seedCatalog } from "../src/server/seed";

await seedCatalog(getDb());
console.log("Catalogue seeded from the Opportunity Board (existing rows kept).");
