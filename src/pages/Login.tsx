import { useState } from "react";
import { FlaskConical, Lock, Mail, ShieldCheck } from "lucide-react";
import { switchLocalWorkspace } from "../lib/backend/index.ts";
import { DEMO_USERS } from "@shared/demo-data.ts";
import { useApp } from "../lib/app.tsx";
import { Button, Card, ErrorNote, Field, Input, Notice } from "../components/ui.tsx";

export default function Login() {
  const { backend, sessionError, refreshSession, toast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const invited = typeof window !== "undefined" && /type=invite|type=magiclink/.test(window.location.hash);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-10">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2 lg:items-center">
        <div className="text-white">
          <div className="mb-4 flex items-center gap-2.5">
            <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden><circle cx="12" cy="16" r="6" fill="none" stroke="#60A5FA" strokeWidth="2.5" /><circle cx="20" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.5" /></svg>
            <span className="font-display text-2xl font-bold">ConnectSphere</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Turn your chapter directory into a referral engine.</h1>
          <p className="mt-3 text-navy-200">Transparent compatibility scores, reciprocal referral opportunities, contact-sphere discovery and one-to-one briefs — built from your chapter's own member data.</p>
          <ul className="mt-6 space-y-2 text-sm text-navy-200">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-300" /> Invitation-only access with role-based permissions</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-300" /> Deterministic, explainable scoring — no black-box numbers</li>
          </ul>
          <p className="mt-8 text-[11px] text-navy-300">Independent tool. Not affiliated with or endorsed by BNI.</p>
        </div>
        <Card className="p-6">
          {backend.mode === "demo" ? (
            <div>
              <div className="mb-1 flex items-center gap-2 text-violet-700"><FlaskConical className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Demo mode</span></div>
              <h2 className="text-lg font-semibold text-navy-950">Explore with fictional data</h2>
              <p className="mt-1 text-sm text-slate-600">A fictional demo chapter, held only in your browser. Choose a persona:</p>
              <div className="mt-4 space-y-2">
                {DEMO_USERS.map((p) => (
                  <button key={p.userId} onClick={() => run(async () => {
                    if (backend.workspace !== "demo") {
                      try { localStorage.setItem("connectsphere-demo-session", p.userId); } catch { /* ignore */ }
                      switchLocalWorkspace("demo");
                      return;
                    }
                    await backend.demoSignIn!(p.userId);
                    await refreshSession();
                  })}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50/50">
                    <span className="font-medium text-navy-950">{p.label}</span>
                    <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] capitalize text-navy-800">{p.role}</span>
                  </button>
                ))}
              </div>
              <div className="my-5 border-t border-slate-100" />
              <div className="mb-1 flex items-center gap-2 text-navy-700"><Lock className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Private workspace</span></div>
              <h2 className="text-lg font-semibold text-navy-950">Use my real chapter</h2>
              <p className="mt-1 text-sm text-slate-600">Starts empty, with no fictional members. Import your chapter roster; it stays in this browser only and is never uploaded or shared.</p>
              <Button className="mt-3 w-full" onClick={() => run(async () => {
                if (backend.workspace !== "private") {
                  try { localStorage.setItem("connectsphere-private-session", "private-user"); } catch { /* ignore */ }
                  switchLocalWorkspace("private");
                  return;
                }
                await backend.demoSignIn!("private-user");
                await refreshSession();
              })}><Lock className="h-4 w-4" /> Open my private workspace</Button>
              <div className="mt-4"><Notice>For chapter-wide sign-in with real accounts, deploy the live version (see the setup guide). Demo and real data are never mixed.</Notice></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-navy-950">{invited ? "Accept your invitation" : "Sign in to your chapter"}</h2>
                <p className="mt-1 text-sm text-slate-600">{invited ? "Your invitation link signs you in automatically. Set a password in Account settings afterwards." : "Access is by invitation from your chapter admin."}</p>
              </div>
              {sessionError && <ErrorNote message={sessionError} />}
              {err && <ErrorNote message={err} />}
              {sent ? (
                <Notice>Check {email} for a sign-in link.</Notice>
              ) : (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => backend.signInWithPassword(email, password)); }}>
                  <Field label="Email"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                  <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                  <Button type="submit" className="w-full" loading={busy} disabled={!password}>Sign in</Button>
                  <Button type="button" variant="secondary" className="w-full" disabled={!email || busy}
                    onClick={() => run(async () => { await backend.sendMagicLink(email); setSent(true); toast("Sign-in link sent", "info"); })}>
                    <Mail className="h-4 w-4" /> Email me a sign-in link
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
