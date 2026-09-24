import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Message } from "./db.js";
import { dynamicContext, staticSystemPrompt, type ContextInput } from "./prompts.js";

export const TurnDecision = z.object({
  replies: z.array(z.string()),
  name: z.string().nullable().describe("The lead's first name if learned, else null"),
  profile_updates: z.array(z.object({ key: z.string(), value: z.string() })),
  score: z.number().describe("0-100 fit and intent score"),
  status: z.enum(["engaging", "qualified", "disqualified", "nurture", "needs_human", "opted_out"]),
  status_reason: z.string(),
  summary: z.string(),
  recommended_opener: z.string(),
  followup_hours: z.number().nullable(),
  checkin_result: z.enum(["done", "partial", "missed"]).nullable().describe("Accountability mode only; null otherwise"),
  task_updates: z.array(z.object({ task_id: z.number(), status: z.enum(["done", "missed", "open"]) })),
  new_tasks: z.array(z.object({ title: z.string(), due_in_hours: z.number().nullable() })),
});
export type TurnDecision = z.infer<typeof TurnDecision>;

const Composed = z.object({ message: z.string() });

export interface ConverseInput extends ContextInput {
  history: Message[];
}
export interface ComposeInput extends ContextInput {
  history: Message[];
  purpose: string;
}

/** The agent's decision-making. Swappable so tests and demos run without API calls. */
export interface Brain {
  converse(input: ConverseInput): Promise<TurnDecision>;
  compose(input: ComposeInput): Promise<string>;
}

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";
const EFFORT = (process.env.CLAUDE_EFFORT ?? "medium") as "low" | "medium" | "high";

function toMessages(history: Message[], source: string | null): Anthropic.Beta.BetaMessageParam[] {
  const msgs: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({
    role: m.direction === "in" ? "user" : "assistant",
    content: m.body,
  }));
  if (msgs[0]?.role !== "user") {
    msgs.unshift({ role: "user", content: `[Lead captured via ${source ?? "an inbound form"}. Our team messaged first.]` });
  }
  return msgs;
}

function transcript(history: Message[]): string {
  return history.map((m) => `${m.direction === "in" ? "LEAD" : "US"}: ${m.body}`).join("\n") || "(no messages yet)";
}

export class ClaudeBrain implements Brain {
  constructor(private client = new Anthropic()) {}

  private system(input: ContextInput, extra = ""): Anthropic.Beta.BetaTextBlockParam[] {
    return [
      { type: "text", text: staticSystemPrompt(input.tenant), cache_control: { type: "ephemeral" } },
      { type: "text", text: dynamicContext(input) + extra },
    ];
  }

  async converse(input: ConverseInput): Promise<TurnDecision> {
    // The zod helper relaxes some constraints (e.g. enums) in the wire schema and
    // validates locally, so a rare invalid output throws; retry once before escalating.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.converseOnce(input);
      } catch (err) {
        if (err instanceof Anthropic.APIError || attempt >= 1) {
          if (err instanceof Anthropic.APIError) throw err;
          return this.escalation(input, `invalid model output: ${String(err).slice(0, 200)}`);
        }
      }
    }
  }

  private escalation(input: ConverseInput, reason: string): TurnDecision {
    return {
      replies: [],
      name: null,
      profile_updates: [],
      score: input.contact.score,
      status: "needs_human",
      status_reason: reason,
      summary: input.contact.summary,
      recommended_opener: "",
      followup_hours: null,
      checkin_result: null,
      task_updates: [],
      new_tasks: [],
    };
  }

  private async converseOnce(input: ConverseInput): Promise<TurnDecision> {
    const res = await this.client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format: betaZodOutputFormat(TurnDecision) },
      system: this.system(input),
      messages: toMessages(input.history, input.contact.source),
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      return this.escalation(input, `model returned no decision (stop_reason=${res.stop_reason})`);
    }
    return res.parsed_output;
  }

  async compose(input: ComposeInput): Promise<string> {
    const res = await this.client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format: betaZodOutputFormat(Composed) },
      system: this.system(
        input,
        `\n\n# Task
You are writing ONE proactive WhatsApp message (they have not just messaged you).
Purpose: ${input.purpose}
Rules: personal to this person and the conversation so far; one idea; under 60 words; end with an easy reply prompt; never repeat an earlier message; never pretend they said something they did not.`,
      ),
      messages: [{ role: "user", content: `Conversation so far:\n${transcript(input.history)}\n\nWrite the message.` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`compose failed: ${res.stop_reason}`);
    return res.parsed_output.message;
  }
}
