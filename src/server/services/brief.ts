import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { PLAN } from "@/data/growth-plan";
import type { DB } from "../db";
import { briefs } from "../db/schema";
import { HttpError } from "../http";

const MODEL = "claude-opus-5-5";

const SYSTEM = `You write the founder's morning brief for Measure Pixel, a growth-systems agency in Chennai, India.
Audience goal: ${PLAN.audience}
Positioning: ${PLAN.positioning}
North star: ${PLAN.northStar}.

Write for one reader: the founder, at 8:30 am, on a phone. Plain, direct sentences. Indian rupee amounts in Indian grouping.
Structure, as short markdown:
1. One line: where he stands (signed vs target, gap, days left) and the pace needed.
2. "Today's three" — the three highest-leverage actions, each one sentence starting with a verb, specific to today's season and pipeline. Money already in the pipeline comes first.
3. "Be seen by" — one concrete visibility move for today aimed at a named decision-maker type, using the season's angle.
4. "Say this" — one message he can paste to a prospect today (max 60 words), no hype, one clear ask.
5. "Other income" — one small action for a non-retainer income stream.
Use only facts in the data provided. Never invent clients, numbers or results. Under 220 words.`;

export async function getBrief(db: DB, date: string) {
  const [row] = await db.select().from(briefs).where(eq(briefs.date, date));
  return row ?? null;
}

/** Writes (or rewrites) today's brief from the morning-page context. Needs ANTHROPIC_API_KEY on the server. */
export async function writeBrief(db: DB, date: string, context: unknown): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(409, "AI brief is off: set ANTHROPIC_API_KEY on the server. The plan below works without it.");
  const client = new Anthropic();
  let text = "";
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Today's data (JSON):\n${JSON.stringify(context)}` }],
    });
    if (res.stop_reason === "refusal") throw new HttpError(502, "The brief could not be written for today's data. Try again later.");
    text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(502, "ANTHROPIC_API_KEY was rejected. Check the key in the server settings.");
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, "The AI service is busy. Try again in a minute.");
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `AI service error (${e.status}). Try again later.`);
    throw new HttpError(502, "Could not reach the AI service. Try again later.");
  }
  if (!text) throw new HttpError(502, "The AI service returned an empty brief. Try again.");
  await db.insert(briefs).values({ date, text, model: MODEL }).onConflictDoUpdate({ target: briefs.date, set: { text, model: MODEL, createdAt: new Date().toISOString() } });
  return text;
}
