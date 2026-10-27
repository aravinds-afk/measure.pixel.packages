import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Canonical records. Google Sheets is a downstream copy (see sync_jobs). Money = integer paise. */

const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
const createdAt = () => text("created_at").notNull().default(now);
const updatedAt = () => text("updated_at").notNull().default(now);

// ------------------------------------------------------------- Identity ---

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "consultant"] }).notNull().default("consultant"),
  canOverridePrices: integer("can_override_prices", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
  updatedAt: updatedAt(),
  updatedBy: text("updated_by"),
});

// ------------------------------------------------------------ Catalogue ---
// Editable columns are the live (possibly overridden) values; source_snapshot
// keeps the Opportunity Board original. Rows are deactivated, never deleted.

export const serviceLinks = sqliteTable("service_links", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  note: text("note"),
  sourceSnapshot: json<Record<string, unknown>>("source_snapshot"),
});

export type PriceOption = {
  id: string;
  label: string;
  model: "per_unit" | "fixed_project" | "fixed_package" | "setup_plus_monthly" | "monthly" | "annual" | "custom";
  unitPrice?: number;
  unitLabel?: string;
  setupFee?: number;
  monthlyFee?: number;
  annualFee?: number;
  source: "brief-example" | "admin";
};

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  linkId: text("link_id").notNull(),
  description: text("description").notNull().default(""),
  /** Empty = relevant to every industry. */
  industryIds: json<string[]>("industry_ids").notNull().default(sql`'[]'`),
  defaultModel: text("default_model").notNull().default("custom"),
  priceOptions: json<PriceOption[]>("price_options").notNull().default(sql`'[]'`),
  deliveryCostOneTime: integer("delivery_cost_one_time").notNull().default(0),
  deliveryCostMonthly: integer("delivery_cost_monthly").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  origin: text("origin", { enum: ["opportunity_board", "admin"] }).notNull().default("admin"),
  sourceSnapshot: json<Record<string, unknown>>("source_snapshot"),
  updatedAt: updatedAt(),
});

export const industryClusters = sqliteTable("industry_clusters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  sourceSnapshot: json<Record<string, unknown>>("source_snapshot"),
});

export const industries = sqliteTable("industries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clusterId: text("cluster_id").notNull(),
  keywords: json<string[]>("keywords").notNull().default(sql`'[]'`),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  origin: text("origin", { enum: ["opportunity_board", "admin"] }).notNull().default("admin"),
  sourceSnapshot: json<Record<string, unknown>>("source_snapshot"),
});

export type OfferComponentRow = { label: string; serviceIds: string[]; basis: "exact" | "inferred" | "unmapped" | "admin" };

export const offers = sqliteTable("offers", {
  id: text("id").primaryKey(),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  clusterId: text("cluster_id"),
  audienceLabel: text("audience_label").notNull(),
  buyerQuote: text("buyer_quote").notNull(),
  components: json<OfferComponentRow[]>("components").notNull(),
  upfrontKind: text("upfront_kind", { enum: ["setup", "project"] }).notNull(),
  upfrontMin: integer("upfront_min"),
  upfrontMax: integer("upfront_max"),
  upfrontIncluded: integer("upfront_included", { mode: "boolean" }).notNull().default(false),
  monthlyMin: integer("monthly_min"),
  monthlyMax: integer("monthly_max"),
  monthlyTermMonths: integer("monthly_term_months"),
  suggestedIndustryIds: json<string[]>("suggested_industry_ids").notNull().default(sql`'[]'`),
  description: text("description").notNull().default(""),
  deliveryCostOneTime: integer("delivery_cost_one_time").notNull().default(0),
  deliveryCostMonthly: integer("delivery_cost_monthly").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  origin: text("origin", { enum: ["opportunity_board", "admin"] }).notNull().default("admin"),
  sourceSnapshot: json<Record<string, unknown>>("source_snapshot"),
  updatedAt: updatedAt(),
});

export const auditCategories = sqliteTable("audit_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const auditItems = sqliteTable("audit_items", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull(),
  label: text("label").notNull(),
  help: text("help").notNull().default(""),
  priority: text("priority", { enum: ["high", "medium", "low"] }).notNull(),
  serviceIds: json<string[]>("service_ids").notNull().default(sql`'[]'`),
  autoCheck: text("auto_check"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const recommendationRules = sqliteTable("recommendation_rules", {
  id: text("id").primaryKey(),
  offerId: text("offer_id").notNull(),
  triggers: json<unknown[]>("triggers").notNull(),
  minScore: integer("min_score").notNull(),
  outcome: text("outcome").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: updatedAt(),
});

export const dependencyRules = sqliteTable("dependency_rules", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  requiresServiceId: text("requires_service_id").notNull(),
  reason: text("reason").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// -------------------------------------------------------------- Records ---

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    businessName: text("business_name").notNull(),
    website: text("website").notNull().default(""),
    industryId: text("industry_id"),
    contactPerson: text("contact_person").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    instagram: text("instagram").notNull().default(""),
    linkedin: text("linkedin").notNull().default(""),
    youtube: text("youtube").notNull().default(""),
    otherLinks: json<string[]>("other_links").notNull().default(sql`'[]'`),
    notes: text("notes").notNull().default(""),
    nextFollowUp: text("next_follow_up"),
    lastContactAt: text("last_contact_at"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("clients_name_idx").on(t.businessName)],
);

export type AuditResponseRow = {
  status: "working_well" | "needs_improvement" | "missing" | "not_applicable" | "not_assessed";
  notes?: string;
  evidence?: string;
  /** auto-verified: set from website evidence. consultant: set or changed by a person. */
  source?: "auto-verified" | "consultant";
  confirmedByClient?: boolean;
  suggestion?: { status: string; note: string; evidence?: string } | null;
};

export type CustomAuditItem = { id: string; categoryId: string; label: string; priority: "high" | "medium" | "low"; serviceIds: string[] };

export const audits = sqliteTable(
  "audits",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    status: text("status", { enum: ["draft", "completed"] }).notNull().default("draft"),
    industryId: text("industry_id"),
    goals: json<string[]>("goals").notNull().default(sql`'[]'`),
    goalNotes: text("goal_notes").notNull().default(""),
    painOfferIds: json<string[]>("pain_offer_ids").notNull().default(sql`'[]'`),
    budgetMonthly: integer("budget_monthly"),
    readiness: text("readiness"),
    discovery: json<unknown>("discovery"),
    responses: json<Record<string, AuditResponseRow>>("responses").notNull().default(sql`'{}'`),
    customItems: json<CustomAuditItem[]>("custom_items").notNull().default(sql`'[]'`),
    consultantNotes: text("consultant_notes").notNull().default(""),
    rev: integer("rev").notNull().default(1),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("audits_client_idx").on(t.clientId)],
);

export const recommendations = sqliteTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id").notNull(),
    key: text("key").notNull(),
    group: text("group", { enum: ["offer", "supporting", "in_place"] }).notNull(),
    offerId: text("offer_id"),
    serviceId: text("service_id"),
    reason: text("reason").notNull(),
    priority: text("priority").notNull(),
    recommendedPrice: text("recommended_price").notNull().default(""),
    decision: text("decision", { enum: ["pending", "accepted", "removed", "deferred"] }).notNull().default("pending"),
    consultantOverride: integer("consultant_override", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("recommendations_audit_key").on(t.auditId, t.key)],
);

export const quotes = sqliteTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    rootId: text("root_id").notNull(),
    version: integer("version").notNull(),
    clientId: text("client_id").notNull(),
    auditId: text("audit_id"),
    status: text("status", { enum: ["draft", "presented", "sent", "accepted", "rejected", "expired"] }).notNull().default("draft"),
    issueDate: text("issue_date"),
    validUntil: text("valid_until"),
    doc: json<unknown>("doc").notNull(),
    totals: json<unknown>("totals").notNull(),
    oneTimeTotal: integer("one_time_total").notNull().default(0),
    monthlyTotal: integer("monthly_total").notNull().default(0),
    annualTotal: integer("annual_total").notNull().default(0),
    oneTimeNet: integer("one_time_net").notNull().default(0),
    monthlyNet: integer("monthly_net").notNull().default(0),
    annualNet: integer("annual_net").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    taxTotal: integer("tax_total").notNull().default(0),
    initialPayment: integer("initial_payment").notNull().default(0),
    contractValue: integer("contract_value"),
    publicToken: text("public_token").unique(),
    idempotencyKey: text("idempotency_key").unique(),
    rev: integer("rev").notNull().default(1),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    statusChangedAt: text("status_changed_at"),
  },
  (t) => [uniqueIndex("quotes_root_version").on(t.rootId, t.version), index("quotes_client_idx").on(t.clientId), index("quotes_number_idx").on(t.number)],
);

/** Itemised snapshot of a quotation version; rewritten while draft, frozen once issued. */
export const quoteItems = sqliteTable(
  "quote_items",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id").notNull(),
    position: integer("position").notNull(),
    kind: text("kind").notNull(),
    offerId: text("offer_id"),
    serviceId: text("service_id"),
    nameSnapshot: text("name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    billingModel: text("billing_model").notNull(),
    setupFee: integer("setup_fee").notNull(),
    recurringFee: integer("recurring_fee").notNull(),
    annualFee: integer("annual_fee").notNull(),
    optional: integer("optional", { mode: "boolean" }).notNull(),
    lineTotal: integer("line_total").notNull(),
    notes: text("notes").notNull().default(""),
  },
  (t) => [uniqueIndex("quote_items_quote_pos").on(t.quoteId, t.position)],
);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  quoteId: text("quote_id"),
  amount: integer("amount").notNull(),
  receivedOn: text("received_on").notNull(),
  note: text("note").notNull().default(""),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

export const syncJobs = sqliteTable(
  "sync_jobs",
  {
    id: text("id").primaryKey(),
    entity: text("entity", { enum: ["client", "audit", "recommendations", "quote", "catalogue"] }).notNull(),
    entityId: text("entity_id").notNull(),
    status: text("status", { enum: ["pending", "done", "failed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: text("completed_at"),
  },
  (t) => [index("sync_jobs_status_idx").on(t.status), index("sync_jobs_entity_idx").on(t.entity, t.entityId)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
});
