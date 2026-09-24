import { createHmac, timingSafeEqual } from "node:crypto";
import { tenantSecret, type Tenant } from "./tenant.js";

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  /** Meta rejected a free-form message because the 24h customer-service window is closed. */
  windowClosed?: boolean;
}

export interface Messenger {
  sendText(tenant: Tenant, to: string, body: string): Promise<SendResult>;
  sendTemplate(tenant: Tenant, to: string, template: { name: string; language: string }, params: string[]): Promise<SendResult>;
  markRead?(tenant: Tenant, messageId: string): Promise<void>;
}

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION ?? "v23.0"}`;

// WhatsApp template body parameters may not contain newlines, tabs or 4+ spaces.
export function templateSafe(text: string, max = 900): string {
  return text.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, max);
}

export class WhatsAppCloudMessenger implements Messenger {
  private async post(tenant: Tenant, body: unknown): Promise<SendResult> {
    const token = tenantSecret(tenant.whatsapp.accessTokenEnv);
    if (!token) return { ok: false, error: `missing env ${tenant.whatsapp.accessTokenEnv}` };
    const res = await fetch(`${GRAPH}/${tenant.whatsapp.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...(body as object) }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { code?: number; message?: string };
    };
    if (res.ok && json.messages?.[0]) return { ok: true, id: json.messages[0].id };
    const code = json.error?.code;
    return { ok: false, error: `${code ?? res.status}: ${json.error?.message ?? "unknown"}`, windowClosed: code === 131047 };
  }

  sendText(tenant: Tenant, to: string, body: string) {
    return this.post(tenant, { to, type: "text", text: { body, preview_url: true } });
  }

  sendTemplate(tenant: Tenant, to: string, template: { name: string; language: string }, params: string[]) {
    return this.post(tenant, {
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: params.length
          ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: templateSafe(p) })) }]
          : [],
      },
    });
  }

  async markRead(tenant: Tenant, messageId: string) {
    // Also shows the typing indicator while the agent composes its reply.
    await this.post(tenant, { status: "read", message_id: messageId, typing_indicator: { type: "text" } }).catch(() => undefined);
  }
}

/** Records outbound messages instead of sending them. Used by the simulator and tests. */
export class MemoryMessenger implements Messenger {
  sent: { to: string; kind: "text" | "template"; body: string; template?: string }[] = [];
  /** Phone numbers whose 24h window is treated as closed (free-form text is rejected). */
  closedWindows = new Set<string>();
  onSend?: (m: MemoryMessenger["sent"][number]) => void;

  async sendText(_t: Tenant, to: string, body: string): Promise<SendResult> {
    if (this.closedWindows.has(to)) return { ok: false, windowClosed: true, error: "131047" };
    const m = { to, kind: "text" as const, body };
    this.sent.push(m);
    this.onSend?.(m);
    return { ok: true, id: `mem-${this.sent.length}` };
  }
  async sendTemplate(_t: Tenant, to: string, template: { name: string }, params: string[]): Promise<SendResult> {
    const m = { to, kind: "template" as const, body: params.join(" | "), template: template.name };
    this.sent.push(m);
    this.onSend?.(m);
    return { ok: true, id: `mem-${this.sent.length}` };
  }
}

export function verifySignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface InboundMessage {
  phoneNumberId: string;
  from: string;
  profileName?: string;
  waId: string;
  text: string;
  referral?: { source_url?: string; headline?: string; body?: string; ctwa_clid?: string };
}

// Flattens the Cloud API webhook payload into the messages we act on.
// Non-text types are converted into a short textual description for the agent.
export function parseWebhook(payload: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (!v?.messages) continue;
      const names = new Map<string, string>((v.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]));
      for (const m of v.messages) {
        let text: string;
        switch (m.type) {
          case "text":
            text = m.text.body;
            break;
          case "button":
            text = m.button.text;
            break;
          case "interactive":
            text = m.interactive.button_reply?.title ?? m.interactive.list_reply?.title ?? "[interactive reply]";
            break;
          case "image":
          case "video":
          case "document":
            text = `[sent a ${m.type}${m[m.type]?.caption ? `: ${m[m.type].caption}` : ""}]`;
            break;
          case "audio":
            text = "[sent a voice note]";
            break;
          case "location":
            text = `[shared location ${m.location.name ?? ""} ${m.location.address ?? ""}]`.trim();
            break;
          default:
            text = `[sent a ${m.type} message]`;
        }
        out.push({
          phoneNumberId: v.metadata.phone_number_id,
          from: m.from,
          profileName: names.get(m.from),
          waId: m.id,
          text,
          referral: m.referral,
        });
      }
    }
  }
  return out;
}
