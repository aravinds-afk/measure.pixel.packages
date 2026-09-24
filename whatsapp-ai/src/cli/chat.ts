// Terminal simulator: talk to a tenant's agent as a lead, without WhatsApp.
//   npm run chat -- <tenant-id> [lead name]
// Commands: /wait <hours>  advance the clock and run due jobs (nurture, nudges, check-ins)
//           /status        show the lead record      /jobs   pending scheduled jobs
//           /enroll <id>   enroll in a program       /staff <text>  message as the first rep
//           /form          start as a form lead (agent messages first)       /quit
import { createInterface } from "node:readline/promises";
import { ClaudeBrain } from "../brain.js";
import { Store } from "../db.js";
import { Agent } from "../engine.js";
import { loadTenantFiles } from "../tenant.js";
import { HOUR, formatLocal } from "../time.js";
import { MemoryMessenger } from "../whatsapp.js";

const tenantId = process.argv[2] ?? "measure-pixel";
const leadName = process.argv[3] ?? "Test Lead";
const LEAD = "919999999999";

const store = new Store(":memory:");
loadTenantFiles(store, process.env.TENANTS_DIR ?? "tenants");
const tenant = store.getTenant(tenantId);
if (!tenant) {
  console.error(`Unknown tenant "${tenantId}". Available: ${store.listTenants().map((t) => t.id).join(", ")}`);
  process.exit(1);
}

let offset = 0;
const realNow = store.now;
store.now = () => realNow() + offset;

const messenger = new MemoryMessenger();
messenger.onSend = (m) => {
  const who = m.to === LEAD ? tenant.agent.name : `-> staff ${m.to}`;
  console.log(`\n\x1b[36m${who}${m.template ? ` [template ${m.template}]` : ""}:\x1b[0m ${m.body}`);
};
const agent = new Agent(store, new ClaudeBrain(), messenger, { debounceMs: 0, log: () => undefined });
let seq = 0;
const inbound = (from: string, text: string) =>
  agent.handleInbound({ phoneNumberId: tenant.whatsapp.phoneNumberId, from, profileName: leadName, waId: `sim-${++seq}`, text });

console.log(`Simulating ${tenant.name} (${tenant.agent.name}). Clock: ${formatLocal(store.now(), tenant.timezone)}. /help for commands.`);
const rl = createInterface({ input: process.stdin, output: process.stdout });

for (;;) {
  const line = (await rl.question("\n\x1b[33myou:\x1b[0m ")).trim();
  if (!line) continue;
  const [cmd, ...args] = line.split(" ");
  const contact = () => store.findContact(tenant.id, LEAD);

  if (cmd === "/quit") break;
  else if (cmd === "/help") console.log("/wait <hours>  /status  /jobs  /enroll <program>  /staff <text>  /form  /quit");
  else if (cmd === "/form") {
    agent.captureLead(tenant.id, { phone: LEAD, name: leadName, source: "website_form" });
    await agent.tick();
  } else if (cmd === "/wait") {
    const hours = Number(args[0] ?? 1);
    // Step hour by hour so jobs fire in order and quiet hours are respected.
    for (let h = 0; h < hours; h++) {
      offset += HOUR;
      await agent.tick();
    }
    console.log(`(clock: ${formatLocal(store.now(), tenant.timezone)})`);
  } else if (cmd === "/status") console.log(JSON.stringify(contact() ?? null, null, 2));
  else if (cmd === "/jobs") {
    const c = contact();
    for (const j of c ? store.pendingJobs(c.id) : []) console.log(`${formatLocal(j.run_at, tenant.timezone)}  ${j.kind}  ${JSON.stringify(j.payload)}`);
  } else if (cmd === "/enroll") {
    agent.enroll(tenant.id, LEAD, args[0] ?? tenant.accountability.programs[0]?.id ?? "");
    console.log("(enrolled; use /wait to reach the next check-in)");
  } else if (cmd === "/staff") {
    await inbound(tenant.handoff.reps[0]!.phone, args.join(" "));
  } else {
    await inbound(LEAD, line);
    await agent.idle();
  }
}
rl.close();
