import { serve } from "@hono/node-server";
import { ClaudeBrain } from "./brain.js";
import { Store } from "./db.js";
import { Agent } from "./engine.js";
import { createApp } from "./server.js";
import { loadTenantFiles } from "./tenant.js";
import { WhatsAppCloudMessenger } from "./whatsapp.js";

const store = new Store(process.env.DB_PATH ?? "data/agent.db");
if (process.env.SEED_TENANTS !== "false") loadTenantFiles(store, process.env.TENANTS_DIR ?? "tenants");

const agent = new Agent(store, new ClaudeBrain(), new WhatsAppCloudMessenger());
const port = Number(process.env.PORT ?? 3000);
serve({ fetch: createApp(agent).fetch, port });
console.log(`whatsapp-ai listening on :${port}`);

let ticking = false;
setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    await agent.tick();
  } catch (err) {
    console.error("tick failed", err);
  } finally {
    ticking = false;
  }
}, Number(process.env.TICK_MS ?? 30_000));
