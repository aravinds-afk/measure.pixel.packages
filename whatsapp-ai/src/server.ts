import { Hono, type Context } from "hono";
import { z } from "zod";
import type { Agent } from "./engine.js";
import { normalizePhone } from "./engine.js";
import { TenantSchema, tenantSecret, type Tenant } from "./tenant.js";
import { parseWebhook, verifySignature } from "./whatsapp.js";

const LeadInput = z.object({
  phone: z.string().min(8),
  name: z.string().optional(),
  source: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
});

export function createApp(agent: Agent) {
  const app = new Hono();
  const store = agent.store;
  const adminKey = process.env.ADMIN_API_KEY;

  const bearer = (c: Context) => c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const isAdmin = (c: Context) => !!adminKey && bearer(c) === adminKey;

  /** Admin key, or the tenant's own API key, for tenant-scoped routes. */
  const tenantAuth = (c: Context): Tenant | Response => {
    const tenant = store.getTenant(c.req.param("id") ?? "");
    if (!tenant) return c.json({ error: "tenant not found" }, 404);
    const tenantKey = tenantSecret(tenant.apiKeyEnv);
    if (isAdmin(c) || (tenantKey && bearer(c) === tenantKey)) return tenant;
    return c.json({ error: "unauthorized" }, 401);
  };

  app.get("/health", (c) => c.json({ ok: true }));

  // ---- WhatsApp Cloud API webhook
  app.get("/webhook/whatsapp", (c) => {
    const q = c.req.query();
    if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN) {
      return c.text(q["hub.challenge"] ?? "");
    }
    return c.text("forbidden", 403);
  });

  app.post("/webhook/whatsapp", async (c) => {
    const raw = await c.req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return c.text("bad json", 400);
    }
    const phoneNumberId = (payload as any)?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    const tenant = phoneNumberId ? store.tenantByPhoneNumberId(phoneNumberId) : undefined;
    const secret = tenantSecret(tenant?.whatsapp.appSecretEnv) ?? process.env.WHATSAPP_APP_SECRET;
    if (secret && !verifySignature(raw, c.req.header("x-hub-signature-256"), secret)) return c.text("bad signature", 401);
    if (!secret && process.env.NODE_ENV === "production") return c.text("app secret not configured", 500);

    // Acknowledge immediately; Meta retries slow webhooks.
    for (const msg of parseWebhook(payload)) {
      void agent.handleInbound(msg).catch((err) => console.error("inbound failed", err));
    }
    return c.text("ok");
  });

  // ---- Lead intake (forms, ads via Zapier/Make, CRMs, landing pages)
  app.post("/api/tenants/:id/leads", async (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    const parsed = LeadInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
    const contact = agent.captureLead(tenant.id, parsed.data);
    return c.json({ contact }, 201);
  });

  // ---- Admin / reseller API
  app.get("/api/tenants", (c) => {
    if (!isAdmin(c)) return c.json({ error: "unauthorized" }, 401);
    return c.json(store.listTenants().map((t) => ({ id: t.id, name: t.name, active: t.active, phoneNumberId: t.whatsapp.phoneNumberId })));
  });

  app.put("/api/tenants/:id", async (c) => {
    if (!isAdmin(c)) return c.json({ error: "unauthorized" }, 401);
    const parsed = TenantSchema.safeParse({ ...(await c.req.json().catch(() => ({}))), id: c.req.param("id") });
    if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
    store.upsertTenant(parsed.data);
    return c.json({ ok: true, tenant: parsed.data });
  });

  app.get("/api/tenants/:id/metrics", (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    const days = Number(c.req.query("days") ?? 30);
    return c.json(store.metrics(tenant.id, store.now() - days * 86_400_000));
  });

  app.get("/api/tenants/:id/leads", (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    return c.json(store.listContacts(tenant.id, c.req.query("status"), Number(c.req.query("limit") ?? 100)));
  });

  app.get("/api/tenants/:id/leads/:phone", (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    const contact = store.findContact(tenant.id, normalizePhone(c.req.param("phone")));
    if (!contact) return c.json({ error: "not found" }, 404);
    return c.json({
      contact,
      messages: store.recentMessages(contact.id, 200),
      tasks: store.tasksFor(contact.id),
      enrollments: store.activeEnrollments(contact.id),
      pendingJobs: store.pendingJobs(contact.id),
    });
  });

  app.post("/api/tenants/:id/leads/:phone/mode", async (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    const body = z.object({ mode: z.enum(["bot", "human"]) }).safeParse(await c.req.json().catch(() => null));
    const contact = store.findContact(tenant.id, normalizePhone(c.req.param("phone")));
    if (!contact || !body.success) return c.json({ error: "bad request" }, 400);
    return c.json(store.updateContact(contact.id, { mode: body.data.mode }));
  });

  app.post("/api/tenants/:id/enroll", async (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    const body = z.object({ phone: z.string(), programId: z.string() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: body.error.issues }, 400);
    try {
      return c.json(agent.enroll(tenant.id, body.data.phone, body.data.programId), 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  app.post("/api/tenants/:id/tasks", async (c) => {
    const tenant = tenantAuth(c);
    if (tenant instanceof Response) return tenant;
    const body = z
      .object({ phone: z.string(), title: z.string().min(1), dueInHours: z.number().nullable().default(null) })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: body.error.issues }, 400);
    const contact = store.findContact(tenant.id, normalizePhone(body.data.phone));
    if (!contact) return c.json({ error: "contact not found" }, 404);
    return c.json(agent.addTask(tenant, contact, body.data.title, body.data.dueInHours), 201);
  });

  return app;
}
