import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Store } from "./db.js";

// One tenant = one brand/client running on one WhatsApp number.
// Secrets are never stored in tenant JSON: fields ending in `Env` name an
// environment variable that holds the value, so configs are safe to commit.

const TemplateRef = z.object({
  name: z.string(),
  language: z.string().default("en"),
});

const Criterion = z.object({
  key: z.string(),
  question: z.string(),
  description: z.string().default(""),
  required: z.boolean().default(true),
  disqualifyIf: z.string().optional(),
});

const NurtureStep = z.object({
  day: z.number().min(0),
  time: z.string().regex(/^\d{2}:\d{2}$/).default("10:30"),
  goal: z.string(),
});

const Person = z.object({ name: z.string(), phone: z.string() });

const Checkin = z.object({
  days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  prompt: z.string(),
});

const Program = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  goals: z.array(z.string()).default([]),
  checkins: z.array(Checkin),
  escalateAfterMisses: z.number().default(3),
  coach: Person,
  weeklyReport: z.object({ day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), time: z.string() }).optional(),
  durationDays: z.number().optional(),
});

export const TenantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  active: z.boolean().default(true),
  timezone: z.string().default("Asia/Kolkata"),
  quietHours: z.object({ start: z.string(), end: z.string() }).default({ start: "21:00", end: "09:00" }),
  whatsapp: z.object({
    phoneNumberId: z.string(),
    accessTokenEnv: z.string(),
    appSecretEnv: z.string().optional(),
  }),
  apiKeyEnv: z.string().optional(),
  agent: z.object({
    name: z.string(),
    role: z.string().default("a member of the team"),
    tone: z.string().default("warm, concise, confident, human. Never robotic."),
    language: z.string().default("Reply in the language the lead writes in."),
    extraInstructions: z.string().default(""),
  }),
  business: z.object({
    description: z.string(),
    offers: z.array(z.object({ name: z.string(), price: z.string().optional(), description: z.string() })).default([]),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    objections: z.array(z.object({ objection: z.string(), response: z.string() })).default([]),
    proof: z.array(z.string()).default([]),
    bookingLink: z.string().optional(),
    knowledge: z.string().default(""),
  }),
  qualification: z.object({
    idealCustomer: z.string(),
    criteria: z.array(Criterion),
    qualifyThreshold: z.number().default(70),
    disqualifyRules: z.array(z.string()).default([]),
    onDisqualified: z.enum(["close", "nurture"]).default("close"),
  }),
  handoff: z.object({
    reps: z.array(Person).min(1),
    template: TemplateRef.optional(),
    webhookUrl: z.string().url().optional(),
    pauseBotAfterHandoff: z.boolean().default(true),
    leadMessage: z.string().default("Perfect. I'm connecting you with {rep} from our team. They'll message you here shortly."),
  }),
  templates: z.object({
    opener: TemplateRef.optional(),
    reengage: TemplateRef.optional(),
  }).default({}),
  nurture: z.object({
    enabled: z.boolean().default(true),
    nudgeAfterMinutes: z.number().default(120),
    steps: z.array(NurtureStep).optional(),
  }).default({ enabled: true, nudgeAfterMinutes: 120 }),
  accountability: z.object({ programs: z.array(Program).default([]) }).default({ programs: [] }),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type Program = z.infer<typeof Program>;
export type Weekday = z.infer<typeof Checkin>["days"][number];

export function tenantSecret(envName: string | undefined): string | undefined {
  return envName ? process.env[envName] : undefined;
}

// Default 60-day nurture cadence. Dense in the first 72h (intent is highest),
// then decaying. Daily-or-faster messaging for 60 days gets a WhatsApp number
// quality-flagged and restricted, so the plan is deliberately spaced.
export const DEFAULT_NURTURE: z.infer<typeof NurtureStep>[] = [
  { day: 1, time: "10:30", goal: "Re-open softly. Reference what they came in for. Ask one easy question." },
  { day: 2, time: "18:30", goal: "Share one concrete quick win or tip relevant to their stated goal." },
  { day: 3, time: "11:00", goal: "Social proof: a short, specific result story from a similar customer." },
  { day: 5, time: "19:00", goal: "Address the most likely objection for this lead before they raise it." },
  { day: 7, time: "10:30", goal: "Direct but low-pressure: ask if the problem is still a priority this month." },
  { day: 10, time: "18:00", goal: "Teach a mistake people in their situation commonly make and how to avoid it." },
  { day: 14, time: "11:00", goal: "Offer a specific next step (call, audit, trial) with a reason to act now." },
  { day: 18, time: "19:00", goal: "Share a myth vs. reality insight tied to their goal." },
  { day: 21, time: "10:30", goal: "Check in on what changed for them since they first reached out." },
  { day: 25, time: "18:30", goal: "Another proof point, different angle from the first one." },
  { day: 30, time: "11:00", goal: "Month mark: summarise the cost of waiting, invite a quick reply." },
  { day: 35, time: "19:00", goal: "Useful resource or framework, no ask." },
  { day: 40, time: "10:30", goal: "Ask one diagnostic question to reveal readiness." },
  { day: 45, time: "18:00", goal: "Case study with numbers." },
  { day: 50, time: "11:00", goal: "Time-bound or capacity-bound reason to talk now, only if true in the business context." },
  { day: 55, time: "19:00", goal: "Personal, human note. Ask whether to keep in touch." },
  { day: 60, time: "11:00", goal: "Breakup message: last check, easy yes/no reply, leave the door open." },
];

/** Upserts every tenants/*.json file into the store. Files are the source of truth when present. */
export function loadTenantFiles(store: Store, dir: string) {
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const parsed = TenantSchema.safeParse(JSON.parse(readFileSync(join(dir, file), "utf8")));
    if (!parsed.success) {
      console.error(`tenant ${file} invalid:`, parsed.error.issues);
      continue;
    }
    store.upsertTenant(parsed.data);
    console.log(`loaded tenant ${parsed.data.id}`);
  }
}
