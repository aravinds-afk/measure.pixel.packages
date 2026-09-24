import type { Brain, TurnDecision } from "./brain.js";
import type { Contact, Enrollment, Job, Store } from "./db.js";
import { DEFAULT_NURTURE, type Program, type Tenant } from "./tenant.js";
import { DAY, HOUR, atLocalTime, formatLocal, nextOccurrence, outsideQuietHours } from "./time.js";
import type { InboundMessage, Messenger } from "./whatsapp.js";

const OPT_OUT = /^\s*(stop|unsubscribe|opt[\s-]?out|cancel|remove me|stop messaging( me)?)\s*[.!]*\s*$/i;
const OPT_IN = /^\s*(start|subscribe|unstop)\s*$/i;
const WINDOW_MS = 24 * HOUR - 5 * 60_000;

export const normalizePhone = (p: string) => p.replace(/\D/g, "");

export interface AgentOptions {
  /** Wait this long after an inbound message before replying, so bursts get one answer. */
  debounceMs?: number;
  log?: (msg: string, data?: unknown) => void;
}

export class Agent {
  private timers = new Map<number, NodeJS.Timeout>();
  private running = new Map<number, Promise<void>>();
  private debounceMs: number;
  private log: NonNullable<AgentOptions["log"]>;

  constructor(
    readonly store: Store,
    readonly brain: Brain,
    readonly messenger: Messenger,
    opts: AgentOptions = {},
  ) {
    this.debounceMs = opts.debounceMs ?? 3500;
    this.log = opts.log ?? ((m, d) => console.log(`[agent] ${m}`, d ?? ""));
  }

  private get now() {
    return this.store.now();
  }

  // ------------------------------------------------------------------ intake

  /** A lead from a form, ad, CRM or landing page. We message first with an approved template. */
  captureLead(tenantId: string, input: { phone: string; name?: string; source?: string; fields?: Record<string, string> }): Contact {
    const tenant = this.requireTenant(tenantId);
    const phone = normalizePhone(input.phone);
    let contact = this.store.findContact(tenant.id, phone);
    if (contact) {
      this.store.event(tenant.id, contact.id, "lead_duplicate", { source: input.source });
      return contact;
    }
    contact = this.store.createContact(tenant.id, phone, { name: input.name, source: input.source, profile: input.fields });
    this.store.event(tenant.id, contact.id, "lead_captured", { source: input.source });
    this.store.schedule(tenant.id, contact.id, "opener", this.now);
    this.scheduleNurture(tenant, contact);
    return contact;
  }

  /** Entry point for every inbound WhatsApp message. */
  async handleInbound(msg: InboundMessage): Promise<void> {
    const tenant = this.store.tenantByPhoneNumberId(msg.phoneNumberId);
    if (!tenant || !tenant.active) return this.log("no active tenant for number", msg.phoneNumberId);
    const phone = normalizePhone(msg.from);

    if (this.staffRole(tenant, phone)) return this.handleStaff(tenant, phone, msg.text);

    let contact = this.store.findContact(tenant.id, phone);
    if (!contact) {
      const source = msg.referral ? `ctwa_ad:${msg.referral.headline ?? msg.referral.source_url ?? "unknown"}` : "inbound_whatsapp";
      contact = this.store.createContact(tenant.id, phone, { name: msg.profileName ?? null, source });
      this.store.event(tenant.id, contact.id, "lead_captured", { source });
      this.scheduleNurture(tenant, contact);
    }
    if (!this.store.addMessage(contact.id, "in", msg.text, msg.waId)) return; // Meta redelivery
    contact = this.store.updateContact(contact.id, { last_inbound_at: this.now });
    this.store.cancelJobs(contact.id, ["nudge"]);
    void this.messenger.markRead?.(tenant, msg.waId);

    for (const e of this.store.activeEnrollments(contact.id)) {
      this.store.updateEnrollment(e.id, { last_response_at: this.now, misses: 0 });
    }

    if (OPT_OUT.test(msg.text)) return this.optOut(tenant, contact);
    if (contact.status === "opted_out") {
      if (!OPT_IN.test(msg.text)) return;
      contact = this.store.updateContact(contact.id, { status: "engaging" });
      this.store.event(tenant.id, contact.id, "opted_in");
    }

    if (contact.mode === "human") return this.relayToRep(tenant, contact, msg.text);

    this.debounce(tenant, contact.id);
  }

  private debounce(tenant: Tenant, contactId: number) {
    clearTimeout(this.timers.get(contactId));
    if (this.debounceMs <= 0) {
      void this.reply(tenant, contactId);
      return;
    }
    this.timers.set(
      contactId,
      setTimeout(() => {
        this.timers.delete(contactId);
        void this.reply(tenant, contactId);
      }, this.debounceMs),
    );
  }

  /** Serialises replies per contact; re-runs if messages arrived mid-flight. */
  reply(tenant: Tenant, contactId: number): Promise<void> {
    const prev = this.running.get(contactId) ?? Promise.resolve();
    const next = prev
      .then(() => this.replyOnce(tenant, contactId))
      .catch((err) => this.log("reply failed", { contactId, err: String(err) }));
    this.running.set(contactId, next);
    void next.finally(() => {
      if (this.running.get(contactId) === next) this.running.delete(contactId);
    });
    return next;
  }

  /** Resolves when every in-flight reply has finished (used by tests and shutdown). */
  async idle(): Promise<void> {
    while (this.running.size || this.timers.size) {
      await Promise.all([...this.running.values()]);
      if (this.timers.size) await new Promise((r) => setTimeout(r, this.debounceMs + 10));
    }
  }

  private async replyOnce(tenant: Tenant, contactId: number) {
    let contact = this.store.getContact(contactId)!;
    const history = this.store.recentMessages(contact.id);
    if (history.at(-1)?.direction !== "in" || contact.mode === "human" || contact.status === "opted_out") return;

    const decision = await this.brain.converse({ ...this.context(tenant, contact), history });
    contact = this.store.getContact(contactId)!;
    await this.apply(tenant, contact, decision);
  }

  // ---------------------------------------------------------- decision logic

  private async apply(tenant: Tenant, contact: Contact, d: TurnDecision) {
    const profile = { ...contact.profile };
    for (const u of d.profile_updates) if (u.value.trim()) profile[u.key] = u.value.trim();
    const isCustomer = contact.status === "customer";
    const status = this.gateStatus(tenant, contact, d, profile);

    contact = this.store.updateContact(contact.id, {
      name: contact.name ?? d.name,
      profile,
      score: Math.max(0, Math.min(100, Math.round(d.score))),
      summary: d.summary || contact.summary,
    });

    // Accountability bookkeeping
    for (const u of d.task_updates) {
      const task = this.store.getTask(u.task_id);
      if (task?.contact_id === contact.id && task.status !== u.status) {
        this.store.setTaskStatus(task.id, u.status);
        this.store.event(tenant.id, contact.id, `task_${u.status}`, { taskId: task.id, title: task.title });
      }
    }
    for (const t of d.new_tasks) this.addTask(tenant, contact, t.title, t.due_in_hours);
    if (d.checkin_result) {
      for (const e of this.store.activeEnrollments(contact.id)) {
        const streak = d.checkin_result === "missed" ? 0 : e.streak + (d.checkin_result === "done" ? 1 : 0);
        this.store.updateEnrollment(e.id, { streak, best_streak: Math.max(e.best_streak, streak) });
      }
      this.store.event(tenant.id, contact.id, `checkin_${d.checkin_result}`);
    }

    for (const text of d.replies) await this.sendFreeform(tenant, contact, text);

    if (status === "opted_out") return this.optOut(tenant, contact, false);
    if (status === "qualified" && contact.status !== "qualified") return this.handoff(tenant, contact, d);
    if (status === "needs_human") return this.escalate(tenant, contact, d.status_reason);
    if (status === "disqualified" && contact.status !== "disqualified") {
      this.store.updateContact(contact.id, { status: "disqualified" });
      this.store.event(tenant.id, contact.id, "disqualified", { reason: d.status_reason });
      if (tenant.qualification.onDisqualified === "close") this.store.cancelJobs(contact.id, ["nurture", "nudge"]);
      return;
    }
    if (isCustomer || contact.status === "qualified") return;
    if (status === "engaging" || status === "nurture") {
      this.store.updateContact(contact.id, { status: status === "nurture" ? "nurturing" : "engaging" });
    }
    // null means "do not chase"; a non-positive value falls back to the tenant default.
    if (d.replies.length && d.followup_hours !== null) {
      const hours = d.followup_hours > 0 ? d.followup_hours : tenant.nurture.nudgeAfterMinutes / 60;
      this.store.schedule(tenant.id, contact.id, "nudge", outsideQuietHours(this.now + hours * HOUR, tenant.quietHours, tenant.timezone));
    }
  }

  /** The model proposes; code enforces the qualification bar so no half-qualified lead reaches sales. */
  private gateStatus(tenant: Tenant, contact: Contact, d: TurnDecision, profile: Record<string, string>): TurnDecision["status"] {
    if (contact.status === "customer" && !["opted_out", "needs_human"].includes(d.status)) return "engaging";
    if (d.status !== "qualified") return d.status;
    const missing = tenant.qualification.criteria.filter((c) => c.required && !profile[c.key]?.trim());
    if (missing.length || d.score < tenant.qualification.qualifyThreshold) {
      this.log("qualification blocked by gate", { contact: contact.id, missing: missing.map((c) => c.key), score: d.score });
      return "engaging";
    }
    return "qualified";
  }

  private async handoff(tenant: Tenant, contact: Contact, d: TurnDecision) {
    const reps = tenant.handoff.reps;
    const rep = reps[this.store.nextRoundRobin(tenant.id, reps.length)]!;
    contact = this.store.updateContact(contact.id, {
      status: "qualified",
      assigned_rep: normalizePhone(rep.phone),
      mode: tenant.handoff.pauseBotAfterHandoff ? "human" : "bot",
    });
    this.store.cancelJobs(contact.id, ["nurture", "nudge"]);
    this.store.event(tenant.id, contact.id, "qualified", { rep: rep.name, score: contact.score });

    await this.sendFreeform(tenant, contact, tenant.handoff.leadMessage.replace("{rep}", rep.name.split(" ")[0]!));

    const brief = [
      `QUALIFIED LEAD for ${tenant.name} (score ${contact.score}/100)`,
      `Name: ${contact.name ?? "unknown"}`,
      `WhatsApp: +${contact.phone}  https://wa.me/${contact.phone}`,
      `Source: ${contact.source ?? "unknown"}`,
      "",
      `Brief: ${contact.summary}`,
      "",
      "Answers:",
      ...Object.entries(contact.profile).map(([k, v]) => `- ${k}: ${v}`),
      "",
      `Suggested opener: ${d.recommended_opener}`,
      "",
      `Commands: "bot ${contact.phone}" hands back to the AI, "won ${contact.phone}" / "lost ${contact.phone}" closes it.`,
    ].join("\n");
    await this.notifyStaff(tenant, rep, brief, [rep.name, `${contact.name ?? contact.phone}: ${contact.summary}`]);
    await this.postWebhook(tenant, "lead.qualified", { contact, rep, recommendedOpener: d.recommended_opener });
  }

  private async escalate(tenant: Tenant, contact: Contact, reason: string) {
    const coach = this.store.activeEnrollments(contact.id).map((e) => this.program(tenant, e.program_id)?.coach)[0];
    const rep = coach ?? tenant.handoff.reps.find((r) => normalizePhone(r.phone) === contact.assigned_rep) ?? tenant.handoff.reps[0]!;
    this.store.updateContact(contact.id, { mode: "human", assigned_rep: normalizePhone(rep.phone) });
    this.store.cancelJobs(contact.id, ["nudge"]);
    this.store.event(tenant.id, contact.id, "escalated", { reason });
    await this.notifyStaff(
      tenant,
      rep,
      `NEEDS A HUMAN: ${contact.name ?? contact.phone} (+${contact.phone})\nReason: ${reason}\nBrief: ${contact.summary}\nhttps://wa.me/${contact.phone}\nReply "bot ${contact.phone}" to hand back to the AI.`,
      [rep.name, `${contact.name ?? contact.phone} needs a human: ${reason}`],
    );
    await this.postWebhook(tenant, "lead.escalated", { contact, reason });
  }

  private async optOut(tenant: Tenant, contact: Contact, confirm = true) {
    this.store.updateContact(contact.id, { status: "opted_out" });
    this.store.cancelJobs(contact.id, ["opener", "nudge", "nurture", "checkin", "task_reminder"]);
    this.store.event(tenant.id, contact.id, "opted_out");
    if (confirm) await this.sendFreeform(tenant, contact, "Understood, you won't receive further messages from us. Reply START anytime to reconnect.");
  }

  private async relayToRep(tenant: Tenant, contact: Contact, text: string) {
    const rep = this.findStaff(tenant, contact.assigned_rep ?? "");
    if (rep) await this.notifyStaff(tenant, rep, `[${contact.name ?? "Lead"} +${contact.phone}]: ${text}`, [rep.name, `${contact.name ?? contact.phone}: ${text}`]);
  }

  // --------------------------------------------------------------- sending

  private windowOpen(contact: Contact) {
    return contact.last_inbound_at !== null && this.now - contact.last_inbound_at < WINDOW_MS;
  }

  private async sendFreeform(tenant: Tenant, contact: Contact, text: string) {
    const res = await this.messenger.sendText(tenant, contact.phone, text);
    if (res.ok) this.recordOutbound(contact, text, res.id);
    else this.log("send failed", { contact: contact.id, error: res.error });
    return res.ok;
  }

  /**
   * Proactive message. Inside the 24h window: free-form. Outside: the tenant's
   * approved re-engagement template ({{1}} = first name, {{2}} = message).
   */
  async sendProactive(tenant: Tenant, contact: Contact, text: string): Promise<boolean> {
    if (this.windowOpen(contact)) {
      const res = await this.messenger.sendText(tenant, contact.phone, text);
      if (res.ok) {
        this.recordOutbound(contact, text, res.id);
        return true;
      }
      if (!res.windowClosed) {
        this.log("send failed", { contact: contact.id, error: res.error });
        return false;
      }
    }
    const tpl = tenant.templates.reengage;
    if (!tpl) {
      this.store.event(tenant.id, contact.id, "skipped_window_closed");
      return false;
    }
    const firstName = contact.name?.split(" ")[0] ?? "there";
    const res = await this.messenger.sendTemplate(tenant, contact.phone, tpl, [firstName, text]);
    if (res.ok) this.recordOutbound(contact, text, res.id);
    else this.log("template failed", { contact: contact.id, error: res.error });
    return res.ok;
  }

  private recordOutbound(contact: Contact, text: string, waId?: string) {
    this.store.addMessage(contact.id, "out", text, waId);
    this.store.updateContact(contact.id, { last_outbound_at: this.now });
  }

  private async notifyStaff(tenant: Tenant, person: { name: string; phone: string }, text: string, templateParams: string[]) {
    const to = normalizePhone(person.phone);
    const res = await this.messenger.sendText(tenant, to, text);
    if (res.ok) return;
    const tpl = tenant.handoff.template;
    if (res.windowClosed && tpl) {
      const r2 = await this.messenger.sendTemplate(tenant, to, tpl, templateParams);
      if (r2.ok) return;
    }
    this.log("staff notification failed; configure handoff.template or have staff message the number daily", { to, error: res.error });
  }

  private async postWebhook(tenant: Tenant, type: string, data: unknown) {
    if (!tenant.handoff.webhookUrl) return;
    await fetch(tenant.handoff.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, tenant: tenant.id, at: new Date(this.now).toISOString(), data }),
    }).catch((err) => this.log("webhook failed", String(err)));
  }

  // -------------------------------------------------------------- nurture

  scheduleNurture(tenant: Tenant, contact: Contact) {
    if (!tenant.nurture.enabled) return;
    const steps = tenant.nurture.steps ?? DEFAULT_NURTURE;
    steps.forEach((s, i) => {
      const at = outsideQuietHours(atLocalTime(contact.created_at, s.day, s.time, tenant.timezone), tenant.quietHours, tenant.timezone);
      this.store.schedule(tenant.id, contact.id, "nurture", at, { step: i, day: s.day, goal: s.goal });
    });
  }

  // -------------------------------------------------------- accountability

  program(tenant: Tenant, id: string): Program | undefined {
    return tenant.accountability.programs.find((p) => p.id === id);
  }

  enroll(tenantId: string, phone: string, programId: string): Enrollment {
    const tenant = this.requireTenant(tenantId);
    const program = this.program(tenant, programId);
    if (!program) throw new Error(`unknown program ${programId}`);
    const p = normalizePhone(phone);
    const contact = this.store.findContact(tenant.id, p) ?? this.store.createContact(tenant.id, p, { source: `program:${programId}` });
    this.store.updateContact(contact.id, { status: "customer", mode: "bot" });
    this.store.cancelJobs(contact.id, ["nurture", "nudge", "checkin"]);
    const e = this.store.enroll(tenant.id, contact.id, programId);
    program.checkins.forEach((c, idx) => {
      const at = nextOccurrence(this.now, c.days, c.time, tenant.timezone);
      this.store.schedule(tenant.id, contact.id, "checkin", at, { enrollmentId: e.id, checkin: idx });
    });
    if (program.weeklyReport && !this.store.hasPendingJob(tenant.id, "weekly_report", programId)) {
      const at = nextOccurrence(this.now, [program.weeklyReport.day], program.weeklyReport.time, tenant.timezone);
      this.store.schedule(tenant.id, null, "weekly_report", at, { key: programId });
    }
    this.store.event(tenant.id, contact.id, "enrolled", { programId });
    return e;
  }

  addTask(tenant: Tenant, contact: Contact, title: string, dueInHours: number | null) {
    const due = dueInHours === null ? null : this.now + dueInHours * HOUR;
    const task = this.store.addTask(contact.id, title, due);
    if (due) {
      const at = outsideQuietHours(Math.max(this.now + HOUR, due - 2 * HOUR), tenant.quietHours, tenant.timezone);
      this.store.schedule(tenant.id, contact.id, "task_reminder", at, { taskId: task.id });
    }
    this.store.event(tenant.id, contact.id, "task_created", { taskId: task.id, title });
    return task;
  }

  // ----------------------------------------------------------- scheduler

  /** Runs due jobs. Call every ~30s. */
  async tick(): Promise<number> {
    const jobs = this.store.claimDueJobs();
    for (const job of jobs) {
      try {
        await this.runJob(job);
        this.store.finishJob(job.id, "done");
      } catch (err) {
        this.log("job failed", { job: job.id, kind: job.kind, err: String(err) });
        if (job.attempts < 3) this.store.finishJob(job.id, "pending", this.now + job.attempts * 5 * 60_000);
        else this.store.finishJob(job.id, "failed");
      }
    }
    return jobs.length;
  }

  private async runJob(job: Job) {
    const tenant = this.store.getTenant(job.tenant_id);
    if (!tenant?.active) return;
    if (job.kind === "weekly_report") return this.weeklyReport(tenant, job);
    const contact = job.contact_id ? this.store.getContact(job.contact_id) : undefined;
    if (!contact || contact.status === "opted_out") return;

    // Never send proactive messages at night; push to morning. The opener is exempt:
    // it answers something the lead just did, and speed-to-lead wins deals.
    const allowed = outsideQuietHours(this.now, tenant.quietHours, tenant.timezone);
    if (job.kind !== "opener" && allowed > this.now) {
      this.store.schedule(tenant.id, contact.id, job.kind, allowed, job.payload);
      return;
    }

    switch (job.kind) {
      case "opener":
        return this.runOpener(tenant, contact);
      case "nudge":
        return this.runNudge(tenant, contact, job);
      case "nurture":
        return this.runNurture(tenant, contact, job);
      case "checkin":
        return this.runCheckin(tenant, contact, job);
      case "task_reminder":
        return this.runTaskReminder(tenant, contact, job);
    }
  }

  private async runOpener(tenant: Tenant, contact: Contact) {
    if (contact.last_inbound_at) return; // they already started talking
    const tpl = tenant.templates.opener;
    const firstName = contact.name?.split(" ")[0] ?? "there";
    if (tpl) {
      const res = await this.messenger.sendTemplate(tenant, contact.phone, tpl, [firstName, tenant.name]);
      if (!res.ok) throw new Error(`opener template failed: ${res.error}`);
      this.recordOutbound(contact, `[template ${tpl.name}] Hi ${firstName}, this is ${tenant.agent.name} from ${tenant.name}.`, res.id);
    } else {
      const text = await this.brain.compose({
        ...this.context(tenant, contact),
        history: [],
        purpose: "First message to a new lead who just enquired. Introduce yourself, reference how they came in, and ask one easy opening question.",
      });
      await this.sendFreeform(tenant, contact, text);
    }
    this.store.updateContact(contact.id, { status: "engaging" });
    this.store.event(tenant.id, contact.id, "opener_sent");
  }

  private async runNudge(tenant: Tenant, contact: Contact, job: Job) {
    if ((contact.last_inbound_at ?? 0) > job.created_at || contact.mode === "human") return;
    if (!["new", "engaging"].includes(contact.status)) return;
    const text = await this.brain.compose({
      ...this.context(tenant, contact),
      history: this.store.recentMessages(contact.id),
      purpose: "They went quiet mid-conversation. Gentle, short nudge that makes replying effortless (e.g. a yes/no or a pick-one question). No guilt.",
    });
    if (await this.sendProactive(tenant, contact, text)) {
      this.store.updateContact(contact.id, { status: "nurturing" });
      this.store.event(tenant.id, contact.id, "nudge_sent");
    }
  }

  private async runNurture(tenant: Tenant, contact: Contact, job: Job) {
    const eligible = ["new", "engaging", "nurturing"].includes(contact.status) ||
      (contact.status === "disqualified" && tenant.qualification.onDisqualified === "nurture");
    if (!eligible || contact.mode === "human") return;
    // Skip if they are actively talking; the conversation itself is the nurture.
    if (contact.last_inbound_at && this.now - contact.last_inbound_at < 12 * HOUR) return;
    const day = Number(job.payload.day);
    const text = await this.brain.compose({
      ...this.context(tenant, contact),
      history: this.store.recentMessages(contact.id, 30),
      purpose: `Nurture sequence, day ${day} of 60. Goal: ${job.payload.goal}`,
    });
    if (await this.sendProactive(tenant, contact, text)) {
      if (contact.status !== "disqualified") this.store.updateContact(contact.id, { status: "nurturing" });
      this.store.event(tenant.id, contact.id, "nurture_sent", { day });
    }
  }

  private async runCheckin(tenant: Tenant, contact: Contact, job: Job) {
    const e = this.store.getEnrollment(Number(job.payload.enrollmentId));
    if (!e || e.status !== "active") return;
    const program = this.program(tenant, e.program_id);
    const checkin = program?.checkins[Number(job.payload.checkin)];
    if (!program || !checkin) return;

    if (program.durationDays && this.now > e.started_at + program.durationDays * DAY) {
      this.store.updateEnrollment(e.id, { status: "completed" });
      this.store.event(tenant.id, contact.id, "program_completed", { programId: program.id });
      return;
    }

    // Previous check-in went unanswered: count a miss and escalate to the coach at the threshold.
    let misses = e.misses;
    if (e.last_checkin_at && (e.last_response_at ?? 0) < e.last_checkin_at) {
      misses += 1;
      this.store.updateEnrollment(e.id, { misses, streak: 0 });
      this.store.event(tenant.id, contact.id, "checkin_unanswered", { misses });
      if (misses === program.escalateAfterMisses) {
        await this.notifyStaff(
          tenant,
          program.coach,
          `ACCOUNTABILITY ALERT: ${contact.name ?? contact.phone} (+${contact.phone}) has not answered ${misses} check-ins in a row for "${program.name}". Consider a personal call. https://wa.me/${contact.phone}`,
          [program.coach.name, `${contact.name ?? contact.phone} missed ${misses} check-ins in ${program.name}`],
        );
      }
    }

    const text = await this.brain.compose({
      ...this.context(tenant, this.store.getContact(contact.id)!),
      history: this.store.recentMessages(contact.id, 20),
      purpose: `Scheduled accountability check-in. ${checkin.prompt}${misses ? ` They have not replied to the last ${misses} check-in(s); be warm, not naggy, and make replying easy.` : ""}`,
    });
    await this.sendProactive(tenant, contact, text);
    this.store.updateEnrollment(e.id, { last_checkin_at: this.now });
    this.store.schedule(tenant.id, contact.id, "checkin", nextOccurrence(this.now, checkin.days, checkin.time, tenant.timezone), job.payload);
  }

  private async runTaskReminder(tenant: Tenant, contact: Contact, job: Job) {
    const task = this.store.getTask(Number(job.payload.taskId));
    if (!task || task.status !== "open") return;
    const text = await this.brain.compose({
      ...this.context(tenant, contact),
      history: this.store.recentMessages(contact.id, 20),
      purpose: `Accountability reminder for task id ${task.id}: "${task.title}"${task.due_at ? `, due ${formatLocal(task.due_at, tenant.timezone)}` : ""}. Ask whether it is done; if not, what is the one next step.`,
    });
    await this.sendProactive(tenant, contact, text);
  }

  private async weeklyReport(tenant: Tenant, job: Job) {
    const programId = String(job.payload.key);
    const program = this.program(tenant, programId);
    if (!program?.weeklyReport) return;
    const since = this.now - 7 * DAY;
    const lines = this.store.programEnrollments(tenant.id, programId).map((e) => {
      const c = this.store.getContact(e.contact_id)!;
      const tasks = this.store.tasksFor(c.id).filter((t) => t.created_at >= since || t.status === "open");
      const done = tasks.filter((t) => t.status === "done").length;
      const open = tasks.filter((t) => t.status === "open").length;
      const flag = e.misses >= program.escalateAfterMisses ? " AT RISK" : "";
      return `- ${c.name ?? c.phone}: streak ${e.streak} (best ${e.best_streak}), missed ${e.misses}, tasks ${done} done / ${open} open${flag}`;
    });
    await this.notifyStaff(
      tenant,
      program.coach,
      `Weekly accountability report: ${program.name}\n${lines.join("\n") || "No active clients."}`,
      [program.coach.name, `Weekly report for ${program.name}: ${lines.length} active clients`],
    );
    const next = nextOccurrence(this.now, [program.weeklyReport.day], program.weeklyReport.time, tenant.timezone);
    this.store.schedule(tenant.id, null, "weekly_report", next, job.payload);
  }

  // ------------------------------------------------------ staff commands

  private findStaff(tenant: Tenant, phone: string) {
    const all = [...tenant.handoff.reps, ...tenant.accountability.programs.map((p) => p.coach)];
    return all.find((p) => normalizePhone(p.phone) === phone);
  }
  private staffRole(tenant: Tenant, phone: string) {
    return !!phone && !!this.findStaff(tenant, phone);
  }

  /**
   * Reps and coaches operate the system from their own WhatsApp by messaging the business number.
   */
  async handleStaff(tenant: Tenant, staffPhone: string, text: string) {
    const staff = this.findStaff(tenant, staffPhone)!;
    const reply = (t: string) => this.messenger.sendText(tenant, staffPhone, t);
    const [cmd = "", arg1 = "", ...rest] = text.trim().split(/\s+/);
    const contact = arg1 ? this.store.findContact(tenant.id, normalizePhone(arg1)) : undefined;
    const need = async () => (contact ? true : (await reply(`No contact found for "${arg1}".`), false));

    switch (cmd.toLowerCase()) {
      case "leads": {
        const leads = this.store.listContacts(tenant.id, "qualified", 10);
        await reply(leads.length ? leads.map((c) => `+${c.phone} ${c.name ?? ""} (${c.score}) ${c.summary.slice(0, 120)}`).join("\n\n") : "No qualified leads yet.");
        return;
      }
      case "take":
        if (!(await need())) return;
        this.store.updateContact(contact!.id, { mode: "human", assigned_rep: staffPhone });
        await reply(`AI paused for +${contact!.phone}. Their messages will be forwarded to you.`);
        return;
      case "bot":
        if (!(await need())) return;
        this.store.updateContact(contact!.id, { mode: "bot" });
        await reply(`AI resumed for +${contact!.phone}.`);
        return;
      case "won":
      case "lost":
        if (!(await need())) return;
        this.store.updateContact(contact!.id, { status: cmd.toLowerCase() === "won" ? "customer" : "disqualified", mode: "human" });
        this.store.cancelJobs(contact!.id, ["nurture", "nudge"]);
        this.store.event(tenant.id, contact!.id, `deal_${cmd.toLowerCase()}`, { by: staff.name });
        await reply(`Marked +${contact!.phone} as ${cmd.toLowerCase()}.`);
        return;
      case "enroll": {
        const programId = rest[0] ?? "";
        try {
          this.enroll(tenant.id, arg1, programId);
          await reply(`Enrolled +${normalizePhone(arg1)} in ${programId}. Check-ins are scheduled.`);
        } catch (err) {
          await reply(`Could not enroll: ${(err as Error).message}. Programs: ${tenant.accountability.programs.map((p) => p.id).join(", ")}`);
        }
        return;
      }
      case "task": {
        if (!(await need())) return;
        const hours = Number(rest[0]);
        const title = rest.slice(1).join(" ");
        if (!Number.isFinite(hours) || !title) return void (await reply("Usage: task <phone> <due-in-hours> <title>"));
        const t = this.addTask(tenant, contact!, title, hours);
        await reply(`Task #${t.id} set for +${contact!.phone}, due ${formatLocal(t.due_at!, tenant.timezone)}.`);
        return;
      }
      case "status": {
        if (!(await need())) return;
        const c = contact!;
        const tasks = this.store.tasksFor(c.id);
        await reply(
          `+${c.phone} ${c.name ?? ""}\nStatus: ${c.status} (${c.mode}) score ${c.score}\n${c.summary}\nTasks: ${tasks.map((t) => `#${t.id} ${t.title} [${t.status}]`).join("; ") || "none"}`,
        );
        return;
      }
      default:
        await reply(
          [
            "Commands:",
            "leads - latest qualified leads",
            "status <phone> - lead or client snapshot",
            "take <phone> / bot <phone> - pause or resume the AI",
            "won <phone> / lost <phone> - close the lead",
            "enroll <phone> <program> - start accountability",
            "task <phone> <hours> <title> - assign a task with a deadline",
          ].join("\n"),
        );
    }
  }

  // ---------------------------------------------------------------- utils

  private context(tenant: Tenant, contact: Contact) {
    const enrollments = this.store
      .activeEnrollments(contact.id)
      .map((enrollment) => ({ enrollment, program: this.program(tenant, enrollment.program_id)! }))
      .filter((x) => x.program);
    return { tenant, contact, tasks: this.store.tasksFor(contact.id), enrollments, now: this.now };
  }

  private requireTenant(id: string): Tenant {
    const t = this.store.getTenant(id);
    if (!t) throw new Error(`unknown tenant ${id}`);
    return t;
  }
}
