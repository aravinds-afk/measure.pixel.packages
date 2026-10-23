import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, CalendarCheck, GitCompare, Globe, History, Mail, MapPin, Pencil, Phone, Save } from "lucide-react";
import { CATEGORIES, getCategory, profileCompleteness, type MemberProfile, type Provenance } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import type { ProfilePatch } from "../lib/backend/index.ts";
import {
  Avatar, Badge, Bar, Button, Card, CardHeader, CategoryIcon, categoryName, EmptyState, ErrorNote, Field, fmtDate, Input, ListInput,
  Notice, PageHeader, ProvenanceBadge, Select, Spinner, Textarea,
} from "../components/ui.tsx";

function Section({ label, items, provenance }: { label: string; items: string[]; provenance?: Provenance }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label} {items.length > 0 && <ProvenanceBadge provenance={provenance} />}</div>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">{items.map((i) => <Badge key={i} tone="slate" className="text-xs">{i}</Badge>)}</div>
      ) : (
        <div className="text-sm text-slate-400">Not provided</div>
      )}
    </div>
  );
}

export default function MemberPage() {
  const { id } = useParams();
  const { backend, memberById, session, isAdmin, refreshMembers, toast } = useApp();
  const m = memberById(id);
  const canEdit = !!m && (isAdmin || m.id === session?.memberId);
  const [editing, setEditing] = useState(false);
  const contact = useAsync(() => (id ? backend.getContact(id) : Promise.resolve(null)), [id]);
  const history = useAsync(() => (id && canEdit ? backend.memberHistory(id) : Promise.resolve([])), [id, canEdit, m?.profileUpdatedAt]);

  if (!m) return <Card><EmptyState title="Member not found">This member does not exist, has been deactivated, or is not visible to you.</EmptyState></Card>;
  const comp = profileCompleteness(m);
  const p = m.fieldProvenance ?? {};
  const cat = getCategory(m.categoryId);

  return (
    <div>
      <PageHeader
        title={m.fullName}
        subtitle={<span className="flex flex-wrap items-center gap-2">{m.company} {m.status === "inactive" && <Badge tone="red">Inactive</Badge>} {m.isDemo && <Badge tone="violet">Fictional demo member</Badge>}</span>}
        actions={
          <>
            {session?.memberId && session.memberId !== m.id && m.status === "active" && (
              <>
                <Link to={`/compatibility/${session.memberId}/${m.id}`}><Button><GitCompare className="h-4 w-4" /> Compatibility</Button></Link>
                <Button variant="secondary" onClick={async () => { try { await backend.saveConnection(m.id, null); toast("Saved to your connections"); } catch (e) { toast((e as Error).message, "error"); } }}><Bookmark className="h-4 w-4" /> Save</Button>
                <Link to={`/meetings?with=${m.id}`}><Button variant="secondary"><CalendarCheck className="h-4 w-4" /> Plan one-to-one</Button></Link>
              </>
            )}
            {canEdit && !editing && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit profile</Button>}
          </>
        }
      />
      {editing ? (
        <ProfileEditor member={m} onDone={async (saved) => { setEditing(false); if (saved) { await refreshMembers(); toast("Profile updated"); } }} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-5">
              <div className="flex items-start gap-4">
                <Avatar member={m} size={72} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-900"><CategoryIcon categoryId={m.categoryId} /> {categoryName(m)} <ProvenanceBadge provenance={p.categoryId} /></div>
                  {!m.categoryId && m.categoryLabel && <p className="mt-1 text-xs text-amber-700">Custom category — not in the profession taxonomy, so scoring confidence is lower.</p>}
                  <p className="mt-2 text-sm text-slate-700">{m.businessDescription || <span className="text-slate-400">No business description yet.</span>}</p>
                  {cat && <p className="mt-2 text-xs text-slate-500">About this profession: {cat.summary}</p>}
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Business profile" subtitle="Used for compatibility scoring. Badges show where each item came from." />
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <Section label="Products & services" items={m.services} provenance={p.services} />
                <Section label="Customer types (ICP)" items={m.customerSegments} provenance={p.customerSegments} />
                <Section label="Customer company size" items={m.companySizes} provenance={p.companySizes} />
                <Section label="Industries served" items={m.industries} provenance={p.industries} />
                <Section label="Service area" items={m.serviceAreas} provenance={p.serviceAreas} />
                <Section label="Problems solved" items={m.problemsSolved} provenance={p.problemsSolved} />
                <Section label="Keywords" items={m.keywords} provenance={p.keywords} />
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Ideal referral</div>
                  <p className="text-sm text-slate-700">{m.idealReferral || <span className="text-slate-400">Not provided</span>}</p>
                </div>
                {m.icpDescription && (
                  <div className="sm:col-span-2">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Ideal customer description</div>
                    <p className="text-sm text-slate-700">{m.icpDescription}</p>
                  </div>
                )}
              </div>
            </Card>
            {canEdit && (
              <Card>
                <CardHeader icon={<History className="h-4 w-4" />} title="Change history" subtitle="Visible to this member and chapter admins." />
                {history.loading ? <Spinner /> : (
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                    {(history.data ?? []).map((h) => (
                      <li key={h.id} className="px-5 py-2.5 text-xs">
                        <span className="font-medium capitalize text-navy-900">{h.operation}</span> · {fmtDate(h.changedAt)}
                        <div className="mt-0.5 truncate text-slate-500">{Object.keys(h.changes).filter((k) => !["id", "chapter_id"].includes(k)).slice(0, 6).join(", ")}</div>
                      </li>
                    ))}
                    {!history.data?.length && <li className="px-5 py-4 text-sm text-slate-500">No changes recorded.</li>}
                  </ul>
                )}
              </Card>
            )}
          </div>
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-2 text-sm font-semibold text-navy-950">Profile completeness</div>
              <div className="flex items-center gap-3"><Bar value={(comp.filled / comp.total) * 100} color="#2563eb" /><span className="text-sm font-semibold">{comp.filled}/{comp.total}</span></div>
              {comp.missing.length > 0 && <p className="mt-2 text-xs text-slate-500">Missing: {comp.missing.join(", ")}. Missing data is never scored as a negative — it lowers confidence instead.</p>}
            </Card>
            <Card className="p-5">
              <div className="mb-3 text-sm font-semibold text-navy-950">Contact</div>
              {contact.loading ? <Spinner /> : contact.data ? (
                <ul className="space-y-2 text-sm">
                  {contact.data.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /><a className="text-blue-700 hover:underline" href={`mailto:${contact.data.email}`}>{contact.data.email}</a></li>}
                  {contact.data.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><a className="text-blue-700 hover:underline" href={`tel:${contact.data.phone}`}>{contact.data.phone}</a></li>}
                  {contact.data.visibility === "private" && <li className="text-xs text-slate-500">Only visible to you and chapter admins.</li>}
                </ul>
              ) : <p className="text-sm text-slate-500">Contact details are private or not provided.</p>}
              {m.website && <a className="mt-3 flex items-center gap-2 text-sm text-blue-700 hover:underline" href={m.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Website</a>}
              {m.serviceAreas.length > 0 && <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 text-slate-400" /> {m.serviceAreas.join(", ")}</div>}
            </Card>
            <Card className="p-5 text-xs text-slate-500">
              <div>Source: <span className="font-medium text-slate-700">{m.source?.replace(/_/g, " ") ?? "—"}</span></div>
              <div className="mt-1">Profile updated: <span className="font-medium text-slate-700">{fmtDate(m.profileUpdatedAt)}</span></div>
              {m.externalId && <div className="mt-1">Member ID: <span className="font-medium text-slate-700">{m.externalId}</span></div>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileEditor({ member, onDone }: { member: MemberProfile; onDone: (saved: boolean) => void }) {
  const { backend } = useApp();
  const [f, setF] = useState<ProfilePatch>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setF({
      fullName: member.fullName, company: member.company ?? "", categoryId: member.categoryId ?? null, categoryLabel: member.categoryLabel ?? "",
      businessDescription: member.businessDescription ?? "", website: member.website ?? "", photoUrl: member.photoUrl ?? "",
      services: member.services, customerSegments: member.customerSegments, companySizes: member.companySizes, industries: member.industries,
      serviceAreas: member.serviceAreas, problemsSolved: member.problemsSolved, keywords: member.keywords, icpDescription: member.icpDescription ?? "", idealReferral: member.idealReferral ?? "",
    });
  }, [member]);
  const s = <K extends keyof ProfilePatch>(k: K, v: ProfilePatch[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    setErr(null);
    if (!f.fullName?.trim()) return setErr("Name is required.");
    if (f.website && !/^https?:\/\//i.test(f.website)) return setErr("Website must start with http:// or https://");
    if (f.photoUrl && !/^https:\/\//i.test(f.photoUrl)) return setErr("Photo URL must start with https://");
    const patch: ProfilePatch = {};
    for (const [k, v] of Object.entries(f) as [keyof ProfilePatch, unknown][]) {
      const cur = (member as unknown as Record<string, unknown>)[k];
      const norm = v === "" ? null : v;
      if (JSON.stringify(cur ?? null) !== JSON.stringify(norm ?? null)) (patch as Record<string, unknown>)[k] = norm;
    }
    setBusy(true);
    try {
      if (Object.keys(patch).length) await backend.updateProfile(member.id, patch);
      onDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4"><Notice>Separate list items with semicolons. Changes you make to your own profile are marked “member-submitted”.</Notice></div>
      {err && <div className="mb-4"><ErrorNote message={err} /></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.fullName ?? ""} onChange={(e) => s("fullName", e.target.value)} /></Field>
        <Field label="Company"><Input value={f.company ?? ""} onChange={(e) => s("company", e.target.value)} /></Field>
        <Field label="Professional category" hint="Choose the closest match; this drives referral-trigger intelligence.">
          <Select value={f.categoryId ?? ""} onChange={(e) => s("categoryId", e.target.value || null)}>
            <option value="">Custom / not listed</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Category label (as shown)"><Input value={f.categoryLabel ?? ""} onChange={(e) => s("categoryLabel", e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Business description"><Textarea value={f.businessDescription ?? ""} onChange={(e) => s("businessDescription", e.target.value)} /></Field></div>
        <Field label="Products & services"><ListInput value={f.services ?? []} onChange={(v) => s("services", v)} placeholder="SEO; Google ads; Landing pages" /></Field>
        <Field label="Customer types (ICP)"><ListInput value={f.customerSegments ?? []} onChange={(v) => s("customerSegments", v)} placeholder="SMEs; Manufacturers" /></Field>
        <Field label="Customer company size"><ListInput value={f.companySizes ?? []} onChange={(v) => s("companySizes", v)} placeholder="11-50; 51-250" /></Field>
        <Field label="Industries served"><ListInput value={f.industries ?? []} onChange={(v) => s("industries", v)} placeholder="Manufacturing; Healthcare" /></Field>
        <Field label="Geographic service area"><ListInput value={f.serviceAreas ?? []} onChange={(v) => s("serviceAreas", v)} placeholder="Chennai; Online" /></Field>
        <Field label="Typical problems solved"><ListInput value={f.problemsSolved ?? []} onChange={(v) => s("problemsSolved", v)} placeholder="Not enough leads; Cash-flow visibility" /></Field>
        <Field label="Keywords"><ListInput value={f.keywords ?? []} onChange={(v) => s("keywords", v)} /></Field>
        <Field label="Website"><Input value={f.website ?? ""} onChange={(e) => s("website", e.target.value)} placeholder="https://" /></Field>
        <Field label="Profile photo URL" hint="An https:// link to an image you are authorised to use."><Input value={f.photoUrl ?? ""} onChange={(e) => s("photoUrl", e.target.value)} placeholder="https://" /></Field>
        <div className="sm:col-span-2"><Field label="My ideal referral" hint="Be specific: who, what size, what situation."><Textarea value={f.idealReferral ?? ""} onChange={(e) => s("idealReferral", e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Ideal customer description"><Textarea value={f.icpDescription ?? ""} onChange={(e) => s("icpDescription", e.target.value)} /></Field></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onDone(false)}>Cancel</Button>
        <Button loading={busy} onClick={save}><Save className="h-4 w-4" /> Save profile</Button>
      </div>
    </Card>
  );
}
