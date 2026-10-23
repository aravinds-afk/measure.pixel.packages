import { describe, expect, it } from "vitest";
import { createDemoBackend } from "../src/lib/backend/demo.ts";
import { DEMO_IDS } from "../supabase/functions/_shared/demo-data.ts";

// Shared browser storage between backend instances, as in a real browser tab.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const signedIn = async (userId: string) => {
  const b = createDemoBackend();
  await b.demoReset!();
  await b.demoSignIn!(userId);
  return b;
};

describe("demo backend workflows and permissions", () => {
  it("member end-to-end: score, save, plan, record referral, feedback", async () => {
    const b = await signedIn("demo-user-member");
    const s = await b.getSession();
    expect(s?.isDemo).toBe(true);
    const r = await b.compatibility(DEMO_IDS.priya, DEMO_IDS.arjun);
    expect(r.score).toBeGreaterThanOrEqual(90);
    const saved = await b.saveConnection(DEMO_IDS.arjun, r.score);
    await b.updateConnection(saved.id, { status: "one_to_one_scheduled" });
    expect((await b.listSaved())[0].events.length).toBe(2);
    const brief = await b.brief(DEMO_IDS.priya, DEMO_IDS.arjun);
    await b.createMeeting({ memberA: DEMO_IDS.priya, memberB: DEMO_IDS.arjun, scheduledFor: null, status: "planned", brief, agreedNextAction: brief.nextAction, followUpDate: brief.followUpDate, outcomeNotes: null });
    expect(await b.listMeetings()).toHaveLength(1);
    await expect(b.recordReferral({ giverId: DEMO_IDS.priya, receiverId: DEMO_IDS.arjun, status: "introduction_made", description: null, businessValue: null, consentConfirmed: false })).rejects.toThrow(/agree/);
    await b.recordReferral({ giverId: DEMO_IDS.priya, receiverId: DEMO_IDS.arjun, status: "introduction_made", description: null, businessValue: null, consentConfirmed: true });
    await expect(b.recordReferral({ giverId: DEMO_IDS.sneha, receiverId: DEMO_IDS.arjun, status: "introduction_made", description: null, businessValue: null, consentConfirmed: true })).rejects.toThrow();
    await b.giveFeedback(r.referrals.aToB[0].id, DEMO_IDS.priya, DEMO_IDS.arjun, "inaccurate", "Not relevant");
    expect((await b.myFeedback())[0].verdict).toBe("inaccurate");
  });

  it("members cannot use admin or leadership functions or edit others", async () => {
    const b = await signedIn("demo-user-member");
    await expect(b.analytics()).rejects.toThrow(/Leadership/);
    await expect(b.saveSettings((await b.getSettings()))).rejects.toThrow(/admin/);
    await expect(b.importPreview([], {})).rejects.toThrow(/admin/);
    await expect(b.deactivate(DEMO_IDS.arjun, "x")).rejects.toThrow(/admin/);
    await expect(b.updateProfile(DEMO_IDS.arjun, { company: "x" })).rejects.toThrow(/own profile/);
    expect(await b.getContact(DEMO_IDS.sneha)).not.toBeNull(); // chapter-visible
  });

  it("admin: weights validated, deactivation hides member, feedback suppression applies", async () => {
    const member = await signedIn("demo-user-member");
    const r = await member.compatibility(DEMO_IDS.priya, DEMO_IDS.arjun);
    await member.giveFeedback(r.referrals.aToB[0].id, DEMO_IDS.priya, DEMO_IDS.arjun, "inaccurate", "wrong");
    const admin = createDemoBackend();
    await admin.demoSignIn!("demo-user-admin");
    const settings = await admin.getSettings();
    await expect(admin.saveSettings({ ...settings, weights: { ...settings.weights, icp_overlap: 99 } })).rejects.toThrow(/100%/);
    const f = (await admin.allFeedback())[0];
    await admin.resolveFeedback(f.id, "Corrected", true);
    const after = await admin.compatibility(DEMO_IDS.priya, DEMO_IDS.arjun);
    expect(after.referrals.aToB.some((o) => o.id === f.key)).toBe(false);
    await admin.deactivate(DEMO_IDS.tara, "Left");
    const m2 = createDemoBackend();
    await m2.demoSignIn!("demo-user-member");
    expect((await m2.listMembers()).some((x) => x.id === DEMO_IDS.tara)).toBe(false);
    expect((await admin.auditLog()).map((a) => a.action)).toContain("member.status_changed");
  });

  it("member self-edits are marked member-submitted", async () => {
    const b = await signedIn("demo-user-member");
    await b.updateProfile(DEMO_IDS.priya, { services: ["SEO", "CRO audits"] });
    const me = (await b.listMembers()).find((x) => x.id === DEMO_IDS.priya)!;
    expect(me.fieldProvenance?.services).toBe("member_submitted");
    expect((await b.memberHistory(DEMO_IDS.priya)).length).toBe(1);
  });
});
