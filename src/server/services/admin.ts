import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { OFFERS, SERVICES, INDUSTRIES } from "@/data/opportunity-board";
import { newId } from "@/lib/ids";
import { hashPassword, type CurrentUser } from "../auth";
import type { DB } from "../db";
import * as s from "../db/schema";
import { HttpError } from "../http";
import { sourceOfferRow, sourceServiceRow } from "../seed";
import { saveSetting, type Settings } from "../settings";

const id = z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "Use lowercase letters, digits and hyphens");
const paise = z.number().int().min(0).max(10_000_000_000);
const models = ["per_unit", "fixed_project", "fixed_package", "setup_plus_monthly", "monthly", "annual", "custom"] as const;

export const schemas = {
  services: z.object({
    id,
    name: z.string().trim().min(1).max(120),
    linkId: z.string().max(40),
    description: z.string().max(2000),
    industryIds: z.array(z.string().max(80)).max(60),
    defaultModel: z.enum(models),
    priceOptions: z.array(z.object({ id, label: z.string().trim().min(1).max(120), model: z.enum(models), unitPrice: paise.optional(), unitLabel: z.string().max(40).optional(), setupFee: paise.optional(), monthlyFee: paise.optional(), annualFee: paise.optional(), source: z.enum(["brief-example", "admin"]) })).max(12),
    deliveryCostOneTime: paise,
    deliveryCostMonthly: paise,
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
  }),
  offers: z.object({
    id,
    number: z.number().int().min(1).max(999),
    name: z.string().trim().min(1).max(120),
    clusterId: z.string().max(40).nullable(),
    audienceLabel: z.string().max(80),
    buyerQuote: z.string().max(500),
    components: z.array(z.object({ label: z.string().trim().min(1).max(80), serviceIds: z.array(z.string().max(80)).max(6), basis: z.enum(["exact", "inferred", "unmapped", "admin"]) })).max(12),
    upfrontKind: z.enum(["setup", "project"]),
    upfrontMin: paise.nullable(),
    upfrontMax: paise.nullable(),
    upfrontIncluded: z.boolean(),
    monthlyMin: paise.nullable(),
    monthlyMax: paise.nullable(),
    monthlyTermMonths: z.number().int().min(1).max(60).nullable(),
    suggestedIndustryIds: z.array(z.string().max(80)).max(60),
    description: z.string().max(2000),
    deliveryCostOneTime: paise,
    deliveryCostMonthly: paise,
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
  }).refine((o) => o.upfrontMin == null || o.upfrontMax == null || o.upfrontMin <= o.upfrontMax, "Setup minimum exceeds maximum")
    .refine((o) => o.monthlyMin == null || o.monthlyMax == null || o.monthlyMin <= o.monthlyMax, "Monthly minimum exceeds maximum"),
  industries: z.object({ id, name: z.string().trim().min(1).max(120), clusterId: z.string().max(40), keywords: z.array(z.string().trim().min(2).max(40)).max(40), active: z.boolean(), sortOrder: z.number().int().min(0).max(10000) }),
  auditItems: z.object({
    id: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
    categoryId: z.string().max(40),
    label: z.string().trim().min(1).max(300),
    help: z.string().max(1000),
    priority: z.enum(["high", "medium", "low"]),
    serviceIds: z.array(z.string().max(80)).max(10),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
  }),
  rules: z.object({
    id: z.string().max(80),
    offerId: z.string().max(80),
    minScore: z.number().int().min(1).max(100),
    outcome: z.string().max(500),
    active: z.boolean(),
    triggers: z.array(z.union([
      z.object({ kind: z.literal("audit"), itemId: z.string().max(40), statuses: z.array(z.enum(["working_well", "needs_improvement", "missing", "not_applicable"])).min(1), weight: z.number().int().min(1).max(10) }),
      z.object({ kind: z.literal("goal"), goalId: z.string().max(40), weight: z.number().int().min(1).max(10) }),
    ])).max(30),
  }),
  dependencies: z.object({ id: z.string().max(80), serviceId: z.string().max(80), requiresServiceId: z.string().max(80), reason: z.string().trim().min(1).max(300), active: z.boolean() }).refine((d) => d.serviceId !== d.requiresServiceId, "A service cannot depend on itself"),
  users: z.object({ id: z.string().max(40).optional(), email: z.string().email().max(200), name: z.string().trim().min(1).max(120), role: z.enum(["admin", "consultant"]), canOverridePrices: z.boolean(), active: z.boolean(), password: z.string().min(10).max(200).optional() }),
};
export type AdminEntity = keyof typeof schemas | "settings";

const tables = { services: s.services, offers: s.offers, industries: s.industries, auditItems: s.auditItems, rules: s.recommendationRules, dependencies: s.dependencyRules } as const;

export async function upsertEntity(db: DB, actor: CurrentUser, entity: AdminEntity, body: unknown) {
  if (entity === "settings") {
    const { key, value } = z.object({ key: z.enum(["revenue", "tax", "pricing", "quote", "company", "plan"]), value: z.record(z.string(), z.unknown()) }).parse(body);
    await saveSetting(key, value as never as Settings[typeof key], actor.id, db);
    return { ok: true };
  }
  if (entity === "users") {
    const u = schemas.users.parse(body);
    const email = u.email.toLowerCase();
    if (u.id) {
      if (u.id === actor.id && (!u.active || u.role !== "admin")) throw new HttpError(409, "You can't remove your own admin access");
      await db.update(s.users).set({ email, name: u.name, role: u.role, canOverridePrices: u.canOverridePrices, active: u.active, ...(u.password ? { passwordHash: await hashPassword(u.password) } : {}) }).where(eq(s.users.id, u.id));
      return { ok: true, id: u.id };
    }
    if (!u.password) throw new HttpError(400, "Set an initial password (at least 10 characters)");
    const [exists] = await db.select().from(s.users).where(eq(s.users.email, email));
    if (exists) throw new HttpError(409, "A user with that email already exists");
    const newUserId = newId("U");
    await db.insert(s.users).values({ id: newUserId, email, name: u.name, role: u.role, canOverridePrices: u.canOverridePrices, active: u.active, passwordHash: await hashPassword(u.password) });
    return { ok: true, id: newUserId };
  }
  const row = schemas[entity].parse(body) as Record<string, unknown>;
  const table = tables[entity];
  const set = { ...row, ...(entity === "services" || entity === "offers" || entity === "rules" ? { updatedAt: new Date().toISOString() } : {}) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(table).values(set as any).onConflictDoUpdate({ target: (table as any).id, set: set as any });
  return { ok: true, id: row.id };
}

/** Restore a board-derived record to its Opportunity Board values (keeps admin-only fields like delivery cost). */
export async function resetToSource(db: DB, entity: AdminEntity, recordId: string) {
  if (entity === "offers") {
    const i = OFFERS.findIndex((o) => o.id === recordId);
    if (i < 0) throw new HttpError(404, "Not a board offer");
    const { sortOrder: _ignored, ...src } = sourceOfferRow(OFFERS[i], i);
    void _ignored;
    await db.update(s.offers).set({ ...src, active: true, updatedAt: new Date().toISOString() }).where(eq(s.offers.id, recordId));
  } else if (entity === "services") {
    const i = SERVICES.findIndex((x) => x.id === recordId);
    if (i < 0) throw new HttpError(404, "Not a board service");
    const { sortOrder: _ignored, ...src } = sourceServiceRow(SERVICES[i], i);
    void _ignored;
    await db.update(s.services).set({ ...src, active: true, updatedAt: new Date().toISOString() }).where(eq(s.services.id, recordId));
  } else if (entity === "industries") {
    const ind = INDUSTRIES.find((x) => x.id === recordId);
    if (!ind) throw new HttpError(404, "Not a board industry");
    await db.update(s.industries).set({ name: ind.name, clusterId: ind.clusterId, active: true }).where(eq(s.industries.id, recordId));
  } else throw new HttpError(400, "Reset is only available for board records");
  return { ok: true };
}
