import type { Brain, ComposeInput, ConverseInput, TurnDecision } from "../src/brain.js";
import { Store } from "../src/db.js";
import { Agent } from "../src/engine.js";
import { TenantSchema, type Tenant } from "../src/tenant.js";
import { zonedTimeToUtc } from "../src/time.js";
import { MemoryMessenger } from "../src/whatsapp.js";

export const LEAD = "919876543210";
export const REP = "910000000000";
export const COACH = "910000000009";

export function decision(p: Partial<TurnDecision> = {}): TurnDecision {
  return {
    replies: ["ok"],
    name: null,
    profile_updates: [],
    score: 20,
    status: "engaging",
    status_reason: "",
    summary: "summary",
    recommended_opener: "Hi!",
    followup_hours: 2,
    checkin_result: null,
    task_updates: [],
    new_tasks: [],
    ...p,
  };
}

export class FakeBrain implements Brain {
  queue: TurnDecision[] = [];
  converseCalls: ConverseInput[] = [];
  composeCalls: ComposeInput[] = [];
  async converse(input: ConverseInput) {
    this.converseCalls.push(input);
    return this.queue.shift() ?? decision();
  }
  async compose(input: ComposeInput) {
    this.composeCalls.push(input);
    return `composed: ${input.purpose.slice(0, 40)}`;
  }
}

export const tenantConfig: Tenant = TenantSchema.parse({
  id: "acme",
  name: "Acme",
  timezone: "Asia/Kolkata",
  whatsapp: { phoneNumberId: "PNID", accessTokenEnv: "X" },
  agent: { name: "Aria" },
  business: { description: "We sell widgets." },
  qualification: {
    idealCustomer: "Widget buyers",
    criteria: [
      { key: "need", question: "What do you need?" },
      { key: "budget", question: "Budget?" },
      { key: "timeline", question: "When?", required: false },
    ],
    qualifyThreshold: 70,
  },
  handoff: { reps: [{ name: "Ravi Kumar", phone: `+${REP}` }] },
  templates: { opener: { name: "lead_opener" }, reengage: { name: "lead_followup" } },
  accountability: {
    programs: [
      {
        id: "fit",
        name: "Fit",
        checkins: [{ days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], time: "20:00", prompt: "Workout done?" }],
        escalateAfterMisses: 2,
        coach: { name: "Coach", phone: COACH },
        weeklyReport: { day: "mon", time: "09:00" },
      },
    ],
  },
});

export function setup(overrides: Partial<Tenant> = {}) {
  const store = new Store(":memory:");
  // Monday 2026-09-21 11:00 IST
  let now = zonedTimeToUtc(2026, 9, 21, 11, 0, "Asia/Kolkata");
  store.now = () => now;
  store.upsertTenant({ ...tenantConfig, ...overrides });
  const brain = new FakeBrain();
  const messenger = new MemoryMessenger();
  const agent = new Agent(store, brain, messenger, { debounceMs: 0, log: () => undefined });
  let seq = 0;
  return {
    store,
    brain,
    messenger,
    agent,
    advance: (ms: number) => (now += ms),
    setNow: (ms: number) => (now = ms),
    get now() {
      return now;
    },
    async say(text: string, from = LEAD) {
      await agent.handleInbound({ phoneNumberId: "PNID", from, waId: `w${++seq}`, text, profileName: "Priya S" });
      await agent.idle();
    },
    /** Advance in 30-minute steps, running the scheduler like production. */
    async runFor(ms: number) {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + 30 * 60_000);
        await agent.tick();
      }
    },
    sentTo: (to: string) => messenger.sent.filter((m) => m.to === to),
  };
}
