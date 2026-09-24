import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { createApp } from "../src/server.js";
import { inQuietHours, localParts, nextOccurrence, outsideQuietHours, zonedTimeToUtc } from "../src/time.js";
import { templateSafe } from "../src/whatsapp.js";
import { LEAD, setup } from "./helpers.js";

const TZ = "Asia/Kolkata";

test("time helpers respect the tenant timezone", () => {
  const mon11 = zonedTimeToUtc(2026, 9, 21, 11, 0, TZ);
  assert.equal(new Date(mon11).toISOString(), "2026-09-21T05:30:00.000Z");
  const next = nextOccurrence(mon11, ["wed"], "20:00", TZ);
  assert.deepEqual([localParts(next, TZ).weekday, localParts(next, TZ).hour], ["wed", 20]);
  const quiet = { start: "21:00", end: "09:00" };
  const late = zonedTimeToUtc(2026, 9, 21, 23, 30, TZ);
  assert.ok(inQuietHours(late, quiet, TZ));
  const moved = outsideQuietHours(late, quiet, TZ);
  assert.deepEqual([localParts(moved, TZ).day, localParts(moved, TZ).hour], [22, 9]);
  const early = zonedTimeToUtc(2026, 9, 22, 6, 0, TZ);
  assert.equal(localParts(outsideQuietHours(early, quiet, TZ), TZ).hour, 9);
  assert.equal(localParts(outsideQuietHours(early, quiet, TZ), TZ).day, 22);
  // DST zone sanity
  const ny = zonedTimeToUtc(2026, 3, 8, 12, 0, "America/New_York");
  assert.equal(localParts(ny, "America/New_York").hour, 12);
});

test("template parameters are sanitised for WhatsApp", () => {
  assert.equal(templateSafe("a\nb\t\tc     d"), "a b c   d");
});

test("webhook verifies Meta signatures and routes messages to the tenant", async () => {
  process.env.WHATSAPP_APP_SECRET = "s3cret";
  process.env.WHATSAPP_VERIFY_TOKEN = "vt";
  const t = setup();
  const app = createApp(t.agent);

  const verify = await app.request("/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42");
  assert.equal(await verify.text(), "42");

  const body = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "PNID" },
              contacts: [{ wa_id: LEAD, profile: { name: "Priya" } }],
              messages: [{ from: LEAD, id: "wamid.1", type: "text", text: { body: "Hi there" } }],
            },
          },
        ],
      },
    ],
  });
  const bad = await app.request("/webhook/whatsapp", { method: "POST", body, headers: { "x-hub-signature-256": "sha256=00" } });
  assert.equal(bad.status, 401);

  const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
  const ok = await app.request("/webhook/whatsapp", { method: "POST", body, headers: { "x-hub-signature-256": sig } });
  assert.equal(ok.status, 200);
  await new Promise((r) => setTimeout(r, 20));
  await t.agent.idle();
  assert.equal(t.store.findContact("acme", LEAD)!.name, "Priya");
  assert.equal(t.brain.converseCalls.length, 1);
});

test("lead intake API requires auth and starts the opener", async () => {
  process.env.ADMIN_API_KEY = "admin";
  const t = setup();
  const app = createApp(t.agent);
  const payload = JSON.stringify({ phone: "+91 98765-43210", name: "Priya", source: "meta_lead_ad", fields: { need: "widgets" } });
  const denied = await app.request("/api/tenants/acme/leads", { method: "POST", body: payload });
  assert.equal(denied.status, 401);
  const res = await app.request("/api/tenants/acme/leads", {
    method: "POST",
    body: payload,
    headers: { authorization: "Bearer admin", "content-type": "application/json" },
  });
  assert.equal(res.status, 201);
  const contact = t.store.findContact("acme", LEAD)!;
  assert.equal(contact.profile.need, "widgets");
  await t.agent.tick();
  assert.equal(t.messenger.sent[0]!.template, "lead_opener");

  const metrics = await (await app.request("/api/tenants/acme/metrics", { headers: { authorization: "Bearer admin" } })).json();
  assert.equal(metrics.leads, 1);
});
