import assert from "node:assert/strict";
import { test } from "node:test";
import { DAY, HOUR } from "../src/time.js";
import { COACH, LEAD, REP, decision, setup } from "./helpers.js";

test("new inbound lead gets a reply, a nudge and the 60-day nurture plan", async () => {
  const t = setup();
  t.brain.queue.push(decision({ replies: ["Hi Priya!", "What are you looking for?"], name: "Priya" }));
  await t.say("Hi, saw your ad");

  const c = t.store.findContact("acme", LEAD)!;
  assert.equal(c.status, "engaging");
  assert.equal(c.name, "Priya S"); // WhatsApp profile name captured at creation
  assert.deepEqual(t.sentTo(LEAD).map((m) => m.body), ["Hi Priya!", "What are you looking for?"]);
  const jobs = t.store.pendingJobs(c.id);
  assert.equal(jobs.filter((j) => j.kind === "nurture").length, 17);
  assert.equal(jobs.filter((j) => j.kind === "nudge").length, 1);
  const lastNurture = jobs.filter((j) => j.kind === "nurture").at(-1)!;
  assert.ok(lastNurture.run_at - c.created_at >= 59 * DAY);
});

test("model cannot qualify a lead with missing required answers", async () => {
  const t = setup();
  t.brain.queue.push(decision({ status: "qualified", score: 95, profile_updates: [{ key: "need", value: "widgets" }] }));
  await t.say("I need widgets");
  const c = t.store.findContact("acme", LEAD)!;
  assert.equal(c.status, "engaging");
  assert.equal(t.sentTo(REP).length, 0);
});

test("fully qualified lead is handed to a rep with a complete brief; bot pauses and relays", async () => {
  const t = setup();
  t.brain.queue.push(
    decision({ profile_updates: [{ key: "need", value: "500 widgets" }], score: 50 }),
    decision({
      status: "qualified",
      score: 88,
      profile_updates: [{ key: "budget", value: "5 lakh" }],
      summary: "Priya, ops head, needs 500 widgets, 5L budget",
      recommended_opener: "Hi Priya, Ravi here about the 500 widgets",
    }),
  );
  await t.say("need 500 widgets");
  await t.say("budget is 5 lakh");

  const c = t.store.findContact("acme", LEAD)!;
  assert.equal(c.status, "qualified");
  assert.equal(c.mode, "human");
  assert.equal(c.assigned_rep, REP);
  assert.match(t.sentTo(LEAD).at(-1)!.body, /Ravi from our team/);
  const brief = t.sentTo(REP)[0]!.body;
  assert.match(brief, /QUALIFIED LEAD/);
  assert.match(brief, /need: 500 widgets/);
  assert.match(brief, /budget: 5 lakh/);
  assert.match(brief, /Hi Priya, Ravi here/);
  assert.equal(t.store.pendingJobs(c.id).filter((j) => j.kind === "nurture").length, 0);

  const calls = t.brain.converseCalls.length;
  await t.say("when will he call?");
  assert.equal(t.brain.converseCalls.length, calls, "AI stays silent in human mode");
  assert.match(t.sentTo(REP).at(-1)!.body, /when will he call\?/);
});

test("STOP opts out, cancels all jobs, and silences the bot", async () => {
  const t = setup();
  await t.say("hello");
  await t.say("STOP");
  const c = t.store.findContact("acme", LEAD)!;
  assert.equal(c.status, "opted_out");
  assert.equal(t.store.pendingJobs(c.id).length, 0);
  const sent = t.sentTo(LEAD).length;
  await t.say("hello again");
  assert.equal(t.sentTo(LEAD).length, sent);
  await t.say("START");
  assert.equal(t.store.findContact("acme", LEAD)!.status, "engaging");
});

test("duplicate webhook deliveries are processed once", async () => {
  const t = setup();
  const msg = { phoneNumberId: "PNID", from: LEAD, waId: "same", text: "hi" };
  await t.agent.handleInbound(msg);
  await t.agent.handleInbound(msg);
  await t.agent.idle();
  assert.equal(t.brain.converseCalls.length, 1);
});

test("form lead gets opener template; nurture uses re-engagement template once the 24h window closes", async () => {
  const t = setup();
  t.agent.captureLead("acme", { phone: "+91 98765 43210", name: "Priya Sharma", source: "website" });
  await t.agent.tick();
  const opener = t.sentTo(LEAD)[0]!;
  assert.equal(opener.template, "lead_opener");
  assert.equal(opener.body, "Priya | Acme");

  await t.runFor(2 * DAY + 8 * HOUR); // through Wednesday 19:00 IST
  const nurture = t.sentTo(LEAD).slice(1);
  assert.equal(nurture.length, 2, "day 1 (Tue 10:30) and day 2 (Wed 18:30) steps");
  for (const m of nurture) {
    assert.equal(m.template, "lead_followup");
    assert.match(m.body, /^Priya \| composed: Nurture sequence/);
  }
  assert.equal(t.store.findContact("acme", LEAD)!.status, "nurturing");
});

test("nurture is skipped while the lead is actively talking", async () => {
  const t = setup();
  t.agent.captureLead("acme", { phone: LEAD, name: "Priya" });
  await t.agent.tick();
  t.advance(23 * HOUR);
  t.brain.queue.push(decision({ followup_hours: null }));
  await t.say("sorry, was busy. tell me more");
  const before = t.messenger.sent.length;
  await t.runFor(2 * HOUR); // day-1 nurture step falls here
  assert.equal(t.messenger.sent.length, before);
});

test("nudge fires once if the lead goes quiet, and not if they reply", async () => {
  const t = setup();
  t.brain.queue.push(decision({ followup_hours: 2 }));
  await t.say("hi");
  await t.runFor(3 * HOUR);
  const nudges = t.sentTo(LEAD).filter((m) => m.body.startsWith("composed: They went quiet"));
  assert.equal(nudges.length, 1);
  assert.equal(t.store.findContact("acme", LEAD)!.status, "nurturing");

  const t2 = setup();
  t2.brain.queue.push(decision({ followup_hours: 2 }), decision({ followup_hours: null }));
  await t2.say("hi");
  t2.advance(HOUR);
  await t2.say("still here");
  await t2.runFor(3 * HOUR);
  assert.equal(t2.sentTo(LEAD).filter((m) => m.body.startsWith("composed: They went quiet")).length, 0);
});

test("accountability: daily check-ins, streaks, missed check-ins escalate to the coach", async () => {
  const t = setup();
  const e = t.agent.enroll("acme", LEAD, "fit");
  const contact = t.store.findContact("acme", LEAD)!;
  assert.equal(contact.status, "customer");

  // Day 1 20:00 check-in; client replies "done".
  await t.runFor(10 * HOUR);
  assert.match(t.sentTo(LEAD).at(-1)!.body, /Scheduled accountability check-in/);
  t.brain.queue.push(decision({ checkin_result: "done", followup_hours: null }));
  await t.say("done! 30 min workout");
  assert.equal(t.store.getEnrollment(e.id)!.streak, 1);
  assert.match(t.brain.converseCalls.at(-1)!.enrollments[0]!.program.name, /Fit/);

  // Two unanswered check-ins -> coach alerted exactly once at the threshold.
  await t.runFor(3 * DAY);
  const alerts = t.sentTo(COACH).filter((m) => m.body.startsWith("ACCOUNTABILITY ALERT"));
  assert.equal(alerts.length, 1);
  const en = t.store.getEnrollment(e.id)!;
  assert.equal(en.streak, 0);
  assert.ok(en.misses >= 2);

  // Replying resets misses.
  await t.say("sorry, back now");
  assert.equal(t.store.getEnrollment(e.id)!.misses, 0);

  // Weekly report goes to the coach on Monday 09:00.
  await t.runFor(4 * DAY);
  assert.ok(t.sentTo(COACH).some((m) => m.body.startsWith("Weekly accountability report")));
});

test("AI-created tasks get due-time reminders and can be closed from replies", async () => {
  const t = setup();
  t.agent.enroll("acme", LEAD, "fit");
  t.brain.queue.push(decision({ new_tasks: [{ title: "Submit meal log", due_in_hours: 5 }], followup_hours: null }));
  await t.say("I'll send my meal log later");
  const task = t.store.tasksFor(t.store.findContact("acme", LEAD)!.id)[0]!;
  assert.equal(task.title, "Submit meal log");

  await t.runFor(4 * HOUR);
  assert.ok(t.sentTo(LEAD).some((m) => m.body.includes("composed: Accountability reminder")));

  t.brain.queue.push(decision({ task_updates: [{ task_id: task.id, status: "done" }], followup_hours: null }));
  await t.say("sent it!");
  assert.equal(t.store.getTask(task.id)!.status, "done");
});

test("staff commands from a rep's WhatsApp control the system", async () => {
  const t = setup();
  await t.say("hi");
  await t.say(`take ${LEAD}`, REP);
  assert.equal(t.store.findContact("acme", LEAD)!.mode, "human");
  await t.say(`bot ${LEAD}`, REP);
  assert.equal(t.store.findContact("acme", LEAD)!.mode, "bot");
  await t.say(`task ${LEAD} 24 Record intro video`, REP);
  assert.match(t.sentTo(REP).at(-1)!.body, /Task #\d+ set/);
  await t.say(`enroll ${LEAD} fit`, REP);
  assert.equal(t.store.findContact("acme", LEAD)!.status, "customer");
  await t.say(`won ${LEAD}`, REP);
  assert.equal(t.brain.converseCalls.length, 1, "staff messages never reach the lead AI");
});

test("round-robin distributes qualified leads across reps", async () => {
  const reps = [
    { name: "A", phone: "911111111111" },
    { name: "B", phone: "912222222222" },
  ];
  const t = setup({ handoff: { reps, pauseBotAfterHandoff: true, leadMessage: "Connecting you with {rep}." } });
  for (const phone of ["913333333333", "914444444444"]) {
    t.brain.queue.push(decision({ status: "qualified", score: 90, profile_updates: [{ key: "need", value: "x" }, { key: "budget", value: "y" }] }));
    await t.say("ready", phone);
  }
  assert.equal(t.sentTo("911111111111").length, 1);
  assert.equal(t.sentTo("912222222222").length, 1);
});
