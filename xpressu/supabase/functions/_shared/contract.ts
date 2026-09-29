/**
 * XpressU API contract — the single source of truth shared by:
 *   - the mobile app (validates every response before rendering)
 *   - the Supabase Edge Function (Deno)
 *   - the local dev server (Node)
 *
 * Keep this file dependency-light: only `zod`.
 */
import { z } from 'zod';

export const OBJECTIVES = [
  'keep_going',
  'flirt',
  'ask_out',
  'recover_dry',
  'answer_question',
  'move_to_date',
  'end_gracefully',
] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const TONES = ['confident', 'funny', 'flirty', 'calm', 'direct', 'romantic'] as const;
export type Tone = (typeof TONES)[number];

export const REPLY_STYLES = ['confident', 'playful', 'direct'] as const;
export type ReplyStyle = (typeof REPLY_STYLES)[number];

export const LIMITS = {
  /** Hard cap on what the user can paste. */
  conversationMaxChars: 4000,
  /** Only the most recent part of the conversation is sent to the AI. */
  conversationSentChars: 2500,
  conversationMinChars: 2,
  userStyleMaxChars: 600,
  replyMaxChars: 400,
  freeDailyGenerations: 5,
} as const;

export const UserStyleSchema = z.object({
  /** A few example messages the user has actually sent. */
  samples: z.string().max(LIMITS.userStyleMaxChars).default(''),
  emoji: z.enum(['never', 'sometimes', 'often']).default('sometimes'),
  casing: z.enum(['lowercase', 'normal']).default('normal'),
  length: z.enum(['short', 'medium']).default('short'),
  notes: z.string().max(200).default(''),
});
export type UserStyle = z.infer<typeof UserStyleSchema>;

export const GenerateRequestSchema = z.object({
  conversation: z
    .string()
    .trim()
    .min(LIMITS.conversationMinChars)
    .max(LIMITS.conversationMaxChars),
  objective: z.enum(OBJECTIVES),
  tone: z.enum(TONES),
  userStyle: UserStyleSchema.nullable().optional(),
  /** Regenerate a single card instead of all three. */
  onlyStyle: z.enum(REPLY_STYLES).optional(),
  /** Previous suggestions to avoid repeating on regenerate. */
  avoid: z.array(z.string().max(LIMITS.replyMaxChars)).max(9).optional(),
  /** Premium: return the full conversation analysis. */
  includeAnalysis: z.boolean().optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const ReplySchema = z.object({
  style: z.enum(REPLY_STYLES),
  text: z.string().trim().min(1).max(LIMITS.replyMaxChars),
  why: z.string().trim().min(1).max(400),
});
export type Reply = z.infer<typeof ReplySchema>;

export const ENGAGEMENT_LEVELS = ['low', 'medium', 'high', 'unclear'] as const;
export const MOMENTUM_LEVELS = ['stalling', 'steady', 'building'] as const;
export const SAFETY_SIGNALS = ['ok', 'low_interest', 'boundary'] as const;
export type SafetySignal = (typeof SAFETY_SIGNALS)[number];

export const AnalysisSchema = z.object({
  tone: z.string().trim().min(1).max(120),
  momentum: z.enum(MOMENTUM_LEVELS),
  engagement: z.enum(ENGAGEMENT_LEVELS),
  questionsToAnswer: z.array(z.string().trim().max(200)).max(5),
  openings: z.array(z.string().trim().max(200)).max(5),
  summary: z.string().trim().max(400),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const SafetySchema = z.object({
  signal: z.enum(SAFETY_SIGNALS),
  guidance: z.string().trim().max(400),
});
export type Safety = z.infer<typeof SafetySchema>;

export const GenerateResponseSchema = z
  .object({
    replies: z.array(ReplySchema).min(1).max(3),
    nextMove: z.string().trim().min(1).max(400),
    analysis: AnalysisSchema.nullable().optional(),
    safety: SafetySchema.optional(),
  })
  .superRefine((value, ctx) => {
    const styles = value.replies.map((r) => r.style);
    if (new Set(styles).size !== styles.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate reply styles', path: ['replies'] });
    }
  });
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

/** Validate an untrusted payload. Returns a typed result, never throws. */
export function parseGenerateResponse(
  payload: unknown,
  expected?: { onlyStyle?: ReplyStyle },
): { ok: true; data: GenerateResponse } | { ok: false; error: string } {
  const result = GenerateResponseSchema.safeParse(payload);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  const data = result.data;
  if (expected?.onlyStyle) {
    const match = data.replies.find((r) => r.style === expected.onlyStyle);
    if (!match) return { ok: false, error: `Missing ${expected.onlyStyle} reply` };
    return { ok: true, data: { ...data, replies: [match] } };
  }
  const missing = REPLY_STYLES.filter((s) => !data.replies.some((r) => r.style === s));
  if (missing.length) return { ok: false, error: `Missing styles: ${missing.join(', ')}` };
  // Stable order: confident, playful, direct.
  const ordered = REPLY_STYLES.map((s) => data.replies.find((r) => r.style === s)!);
  return { ok: true, data: { ...data, replies: ordered } };
}

/** Error envelope returned by the backend for non-2xx responses. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum(['bad_request', 'unauthorized', 'quota_exceeded', 'rate_limited', 'upstream', 'internal']),
    message: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
