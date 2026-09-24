import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { TenantSchema, type Tenant } from "./tenant.js";

export type ContactStatus =
  | "new" // lead captured, not yet replied
  | "engaging" // in qualification conversation
  | "nurturing" // went quiet or not ready; on the 60-day plan
  | "qualified" // passed the bar, handed to sales
  | "disqualified"
  | "customer" // enrolled in an accountability program
  | "opted_out";

export interface Contact {
  id: number;
  tenant_id: string;
  phone: string;
  name: string | null;
  source: string | null;
  status: ContactStatus;
  score: number;
  profile: Record<string, string>;
  summary: string;
  mode: "bot" | "human";
  assigned_rep: string | null;
  last_inbound_at: number | null;
  last_outbound_at: number | null;
  created_at: number;
}

export interface Message {
  id: number;
  contact_id: number;
  direction: "in" | "out";
  body: string;
  created_at: number;
}

export interface Task {
  id: number;
  contact_id: number;
  title: string;
  due_at: number | null;
  status: "open" | "done" | "missed";
  created_at: number;
  completed_at: number | null;
}

export interface Enrollment {
  id: number;
  tenant_id: string;
  contact_id: number;
  program_id: string;
  status: "active" | "paused" | "completed";
  streak: number;
  best_streak: number;
  misses: number;
  last_checkin_at: number | null;
  last_response_at: number | null;
  started_at: number;
}

export type JobKind = "opener" | "nudge" | "nurture" | "checkin" | "task_reminder" | "weekly_report";

export interface Job {
  id: number;
  tenant_id: string;
  contact_id: number | null;
  kind: JobKind;
  run_at: number;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "done" | "cancelled" | "failed";
  attempts: number;
  created_at: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  config TEXT NOT NULL,
  rr_index INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0,
  profile TEXT NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'bot',
  assigned_rep TEXT,
  last_inbound_at INTEGER,
  last_outbound_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, phone)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  body TEXT NOT NULL,
  wa_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_contact ON messages (contact_id, id);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  due_at INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  contact_id INTEGER NOT NULL,
  program_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  misses INTEGER NOT NULL DEFAULT 0,
  last_checkin_at INTEGER,
  last_response_at INTEGER,
  started_at INTEGER NOT NULL,
  UNIQUE (contact_id, program_id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  contact_id INTEGER,
  kind TEXT NOT NULL,
  run_at INTEGER NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_due ON jobs (status, run_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  contact_id INTEGER,
  type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_tenant ON events (tenant_id, type, created_at);
`;

type Row = Record<string, unknown>;

function toContact(r: Row): Contact {
  return { ...(r as unknown as Contact), profile: JSON.parse(r.profile as string) };
}
function toJob(r: Row): Job {
  return { ...(r as unknown as Job), payload: JSON.parse(r.payload as string) };
}

export class Store {
  readonly db: DatabaseSync;
  now: () => number = () => Date.now();

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(SCHEMA);
  }

  // ---- tenants
  upsertTenant(t: Tenant): void {
    const parsed = TenantSchema.parse(t);
    this.db
      .prepare(
        `INSERT INTO tenants (id, config, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at`,
      )
      .run(parsed.id, JSON.stringify(parsed), this.now());
  }
  getTenant(id: string): Tenant | undefined {
    const r = this.db.prepare("SELECT config FROM tenants WHERE id = ?").get(id);
    return r ? TenantSchema.parse(JSON.parse(r.config as string)) : undefined;
  }
  tenantByPhoneNumberId(phoneNumberId: string): Tenant | undefined {
    return this.listTenants().find((t) => t.whatsapp.phoneNumberId === phoneNumberId);
  }
  listTenants(): Tenant[] {
    return this.db
      .prepare("SELECT config FROM tenants ORDER BY id")
      .all()
      .map((r) => TenantSchema.parse(JSON.parse(r.config as string)));
  }
  nextRoundRobin(tenantId: string, size: number): number {
    const r = this.db.prepare("SELECT rr_index FROM tenants WHERE id = ?").get(tenantId);
    const idx = Number(r?.rr_index ?? 0) % size;
    this.db.prepare("UPDATE tenants SET rr_index = ? WHERE id = ?").run((idx + 1) % size, tenantId);
    return idx;
  }

  // ---- contacts
  findContact(tenantId: string, phone: string): Contact | undefined {
    const r = this.db.prepare("SELECT * FROM contacts WHERE tenant_id = ? AND phone = ?").get(tenantId, phone);
    return r ? toContact(r) : undefined;
  }
  getContact(id: number): Contact | undefined {
    const r = this.db.prepare("SELECT * FROM contacts WHERE id = ?").get(id);
    return r ? toContact(r) : undefined;
  }
  createContact(tenantId: string, phone: string, init: { name?: string | null; source?: string | null; profile?: Record<string, string> }): Contact {
    const res = this.db
      .prepare("INSERT INTO contacts (tenant_id, phone, name, source, profile, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(tenantId, phone, init.name ?? null, init.source ?? null, JSON.stringify(init.profile ?? {}), this.now());
    return this.getContact(Number(res.lastInsertRowid))!;
  }
  updateContact(id: number, patch: Partial<Omit<Contact, "id" | "tenant_id" | "phone" | "created_at">>): Contact {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length) {
      const sets = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = entries.map(([k, v]) => (k === "profile" ? JSON.stringify(v) : (v as string | number | null)));
      this.db.prepare(`UPDATE contacts SET ${sets} WHERE id = ?`).run(...values, id);
    }
    return this.getContact(id)!;
  }
  listContacts(tenantId: string, status?: string, limit = 100): Contact[] {
    const rows = status
      ? this.db.prepare("SELECT * FROM contacts WHERE tenant_id = ? AND status = ? ORDER BY id DESC LIMIT ?").all(tenantId, status, limit)
      : this.db.prepare("SELECT * FROM contacts WHERE tenant_id = ? ORDER BY id DESC LIMIT ?").all(tenantId, limit);
    return rows.map(toContact);
  }

  // ---- messages
  addMessage(contactId: number, direction: "in" | "out", body: string, waId?: string): boolean {
    const res = this.db
      .prepare("INSERT OR IGNORE INTO messages (contact_id, direction, body, wa_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(contactId, direction, body, waId ?? null, this.now());
    return res.changes > 0;
  }
  recentMessages(contactId: number, limit = 40): Message[] {
    return (this.db
      .prepare("SELECT * FROM (SELECT * FROM messages WHERE contact_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC")
      .all(contactId, limit) as unknown) as Message[];
  }

  // ---- tasks
  addTask(contactId: number, title: string, dueAt: number | null): Task {
    const res = this.db
      .prepare("INSERT INTO tasks (contact_id, title, due_at, created_at) VALUES (?, ?, ?, ?)")
      .run(contactId, title, dueAt, this.now());
    return this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(res.lastInsertRowid)) as unknown as Task;
  }
  getTask(id: number): Task | undefined {
    return this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as unknown as Task | undefined;
  }
  setTaskStatus(id: number, status: Task["status"]): void {
    this.db.prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?").run(status, status === "done" ? this.now() : null, id);
  }
  tasksFor(contactId: number, status?: Task["status"]): Task[] {
    const rows = status
      ? this.db.prepare("SELECT * FROM tasks WHERE contact_id = ? AND status = ? ORDER BY id").all(contactId, status)
      : this.db.prepare("SELECT * FROM tasks WHERE contact_id = ? ORDER BY id").all(contactId);
    return rows as unknown as Task[];
  }

  // ---- enrollments
  enroll(tenantId: string, contactId: number, programId: string): Enrollment {
    this.db
      .prepare(
        `INSERT INTO enrollments (tenant_id, contact_id, program_id, started_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (contact_id, program_id) DO UPDATE SET status = 'active'`,
      )
      .run(tenantId, contactId, programId, this.now());
    return this.db.prepare("SELECT * FROM enrollments WHERE contact_id = ? AND program_id = ?").get(contactId, programId) as unknown as Enrollment;
  }
  getEnrollment(id: number): Enrollment | undefined {
    return this.db.prepare("SELECT * FROM enrollments WHERE id = ?").get(id) as unknown as Enrollment | undefined;
  }
  activeEnrollments(contactId: number): Enrollment[] {
    return this.db.prepare("SELECT * FROM enrollments WHERE contact_id = ? AND status = 'active'").all(contactId) as unknown as Enrollment[];
  }
  programEnrollments(tenantId: string, programId: string): Enrollment[] {
    return this.db
      .prepare("SELECT * FROM enrollments WHERE tenant_id = ? AND program_id = ? AND status = 'active'")
      .all(tenantId, programId) as unknown as Enrollment[];
  }
  updateEnrollment(id: number, patch: Partial<Omit<Enrollment, "id">>): void {
    const entries = Object.entries(patch);
    if (!entries.length) return;
    this.db
      .prepare(`UPDATE enrollments SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
      .run(...entries.map(([, v]) => v as string | number | null), id);
  }

  // ---- jobs
  schedule(tenantId: string, contactId: number | null, kind: JobKind, runAt: number, payload: Record<string, unknown> = {}): number {
    const res = this.db
      .prepare("INSERT INTO jobs (tenant_id, contact_id, kind, run_at, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(tenantId, contactId, kind, runAt, JSON.stringify(payload), this.now());
    return Number(res.lastInsertRowid);
  }
  cancelJobs(contactId: number, kinds: JobKind[]): void {
    this.db
      .prepare(`UPDATE jobs SET status = 'cancelled' WHERE contact_id = ? AND status = 'pending' AND kind IN (${kinds.map(() => "?").join(",")})`)
      .run(contactId, ...kinds);
  }
  pendingJobs(contactId: number): Job[] {
    return this.db.prepare("SELECT * FROM jobs WHERE contact_id = ? AND status = 'pending' ORDER BY run_at").all(contactId).map(toJob);
  }
  hasPendingJob(tenantId: string, kind: JobKind, key: string): boolean {
    return !!this.db
      .prepare("SELECT 1 FROM jobs WHERE tenant_id = ? AND kind = ? AND status = 'pending' AND json_extract(payload, '$.key') = ?")
      .get(tenantId, kind, key);
  }
  // Atomically claims due jobs so overlapping ticks never double-send.
  claimDueJobs(limit = 25): Job[] {
    const rows = this.db
      .prepare(
        `UPDATE jobs SET status = 'running', attempts = attempts + 1
         WHERE id IN (SELECT id FROM jobs WHERE status = 'pending' AND run_at <= ? ORDER BY run_at LIMIT ?)
         RETURNING *`,
      )
      .all(this.now(), limit);
    return rows.map(toJob);
  }
  finishJob(id: number, status: Job["status"], retryAt?: number): void {
    if (retryAt !== undefined) this.db.prepare("UPDATE jobs SET status = 'pending', run_at = ? WHERE id = ?").run(retryAt, id);
    else this.db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, id);
  }

  // ---- events / analytics
  event(tenantId: string, contactId: number | null, type: string, data: Record<string, unknown> = {}): void {
    this.db
      .prepare("INSERT INTO events (tenant_id, contact_id, type, data, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(tenantId, contactId, type, JSON.stringify(data), this.now());
  }
  metrics(tenantId: string, sinceMs: number) {
    const byStatus = Object.fromEntries(
      this.db
        .prepare("SELECT status, COUNT(*) AS n FROM contacts WHERE tenant_id = ? AND created_at >= ? GROUP BY status")
        .all(tenantId, sinceMs)
        .map((r) => [r.status as string, Number(r.n)]),
    );
    const events = Object.fromEntries(
      this.db
        .prepare("SELECT type, COUNT(*) AS n FROM events WHERE tenant_id = ? AND created_at >= ? GROUP BY type")
        .all(tenantId, sinceMs)
        .map((r) => [r.type as string, Number(r.n)]),
    );
    const ttq = this.db
      .prepare(
        `SELECT AVG(e.created_at - c.created_at) AS avg_ms FROM events e JOIN contacts c ON c.id = e.contact_id
         WHERE e.tenant_id = ? AND e.type = 'qualified' AND e.created_at >= ?`,
      )
      .get(tenantId, sinceMs);
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const qualified = events.qualified ?? 0;
    return {
      leads: total,
      byStatus,
      events,
      qualificationRate: total ? qualified / total : 0,
      avgMinutesToQualify: ttq?.avg_ms ? Math.round(Number(ttq.avg_ms) / 60000) : null,
    };
  }
}
