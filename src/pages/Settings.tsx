import { useEffect, useState } from "react";
import { Download, KeyRound, Lock, RotateCcw, Shield } from "lucide-react";
import { useApp, useAsync } from "../lib/app.tsx";
import { IS_ARTIFACT } from "../lib/env.ts";
import { Button, Card, CardHeader, ErrorNote, Field, Input, Notice, PageHeader, Select, Spinner } from "../components/ui.tsx";

export default function Settings() {
  const { backend, session, me, toast, refreshSession } = useApp();
  const myId = session?.memberId;
  const contact = useAsync(() => (myId ? backend.getContact(myId) : Promise.resolve(null)), [myId]);
  const priv = useAsync(() => (myId ? backend.getPrivate(myId) : Promise.resolve(null)), [myId]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [visibility, setVisibility] = useState<"chapter" | "private">("chapter");
  const [value, setValue] = useState("");
  const [share, setShare] = useState(false);
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (contact.data) { setEmail(contact.data.email ?? ""); setPhone(contact.data.phone ?? ""); setVisibility(contact.data.visibility); }
  }, [contact.data]);
  useEffect(() => {
    if (priv.data) { setValue(priv.data.avgTransactionValue == null ? "" : String(priv.data.avgTransactionValue)); setShare(priv.data.shareWithLeadership); }
  }, [priv.data]);

  async function exportData() {
    const [saved, meetings, referrals, feedback, history] = await Promise.all([backend.listSaved(), backend.listMeetings(), backend.listReferrals(), backend.myFeedback(), myId ? backend.memberHistory(myId) : []]);
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), account: { email: session?.email, role: session?.role, chapter: session?.chapterName }, profile: me, contact: contact.data, confidential: priv.data, savedConnections: saved, meetings, referrals: referrals.filter((r) => r.giverId === myId || r.receiverId === myId), feedback, history }, null, 2);
    if (IS_ARTIFACT) {
      try {
        await navigator.clipboard.writeText(json);
        toast("Your data was copied to the clipboard as JSON");
      } catch {
        toast("Copying is blocked in this browser.", "error");
      }
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "connectsphere-my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <PageHeader title="Privacy & account settings" subtitle="Control who sees your contact details and confidential figures, and get a copy of your data." />
      <div className="grid gap-6 lg:grid-cols-2">
        {myId ? (
          <Card>
            <CardHeader icon={<Lock className="h-4 w-4" />} title="Contact details" subtitle="Chapter admins can always see these; other members only if you allow it." />
            {contact.loading ? <Spinner /> : (
              <div className="space-y-3 p-5">
                <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
                <Field label="Who can see my contact details"><Select value={visibility} onChange={(e) => setVisibility(e.target.value as "chapter" | "private")}><option value="chapter">Members of my chapter</option><option value="private">Only me and chapter admins</option></Select></Field>
                <div className="flex justify-end"><Button onClick={async () => { try { await backend.updateContact(myId, { email: email || null, phone: phone || null, visibility }); toast("Contact settings saved"); } catch (e) { toast((e as Error).message, "error"); } }}>Save</Button></div>
              </div>
            )}
          </Card>
        ) : <Notice>Your account is not linked to a member profile.</Notice>}
        {myId && (
          <Card>
            <CardHeader icon={<Shield className="h-4 w-4" />} title="Confidential business figures" subtitle="Voluntary. Never used for scoring and never sent to AI services." />
            {priv.loading ? <Spinner /> : (
              <div className="space-y-3 p-5">
                <Field label="Average transaction or project value" hint="Helps leadership understand referral value. Leave blank to keep private."><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> Share with my chapter's leadership team</label>
                <div className="flex justify-end"><Button onClick={async () => { const n = value.trim() ? Number(value.replace(/[^\d.]/g, "")) : null; try { await backend.updatePrivate(myId, { avgTransactionValue: n != null && Number.isFinite(n) ? n : null, shareWithLeadership: share }); toast("Saved"); } catch (e) { toast((e as Error).message, "error"); } }}>Save</Button></div>
              </div>
            )}
          </Card>
        )}
        {backend.setPassword && (
          <Card>
            <CardHeader icon={<KeyRound className="h-4 w-4" />} title="Password" subtitle={session?.email} />
            <div className="space-y-3 p-5">
              <Field label="New password" hint="At least 10 characters."><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              <div className="flex justify-end"><Button disabled={pw.length < 10} onClick={async () => { try { await backend.setPassword!(pw); setPw(""); toast("Password updated"); } catch (e) { toast((e as Error).message, "error"); } }}>Update password</Button></div>
            </div>
          </Card>
        )}
        <Card>
          <CardHeader icon={<Download className="h-4 w-4" />} title="Your data" />
          <div className="space-y-3 p-5 text-sm text-slate-700">
            <p>Download everything ConnectSphere holds about you in this chapter: profile, contact settings, saved connections, meetings, referrals and feedback.</p>
            <Button variant="secondary" onClick={exportData}><Download className="h-4 w-4" /> {IS_ARTIFACT ? "Copy my data (JSON)" : "Export my data (JSON)"}</Button>
            <p className="text-xs text-slate-500">To correct imported information, edit your profile — your edits are marked member-submitted and are not overwritten by later imports. To leave the chapter or have your data erased, ask your chapter admin; erasure removes your profile, contact details and relationship records permanently.</p>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="How your data is used" />
          <ul className="list-disc space-y-1.5 p-5 pl-10 text-sm text-slate-700">
            <li>Only members of your chapter can see your profile; inactive members are hidden from the directory.</li>
            <li>Compatibility scores are calculated on the server by a deterministic formula from profile data. They show potential, not guaranteed business.</li>
            <li>Optional plain-language explanations send only categories and scoring findings to the AI service — never names, contact details, values or referral records.</li>
            <li>Referral records are visible only to the two members involved and chapter leadership, and require both members' agreement.</li>
            <li>Administrative actions (imports, role changes, deactivations, erasures) are recorded in an audit log.</li>
          </ul>
        </Card>
        {backend.demoReset && (
          <Card className="lg:col-span-2">
            <CardHeader title="Demo data" subtitle="Everything in demo mode is fictional and stored only in this browser." />
            <div className="p-5"><Button variant="secondary" onClick={async () => { await backend.demoReset!(); await refreshSession(); toast("Demo data reset"); }}><RotateCcw className="h-4 w-4" /> Reset demo data</Button></div>
          </Card>
        )}
        {contact.error && <ErrorNote message={contact.error} />}
      </div>
    </div>
  );
}
