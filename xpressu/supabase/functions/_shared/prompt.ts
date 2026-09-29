/**
 * Conversation-analysis prompt for XpressU.
 *
 * Runs server-side only. The model returns strict JSON that matches
 * `GenerateResponseSchema` in contract.ts (enforced via OpenAI structured
 * outputs and re-validated with zod).
 */
import type { GenerateRequest, Objective, ReplyStyle, Tone, UserStyle } from './contract.ts';

export const PROMPT_VERSION = '2026-09-29.1';

const OBJECTIVE_BRIEFS: Record<Objective, string> = {
  keep_going:
    'Keep the conversation flowing. Answer what needs answering, add a bit of personality, and leave an easy hook for them to reply to.',
  flirt:
    'Add light, respectful flirtation that matches the energy they are giving. Tease gently, compliment specifically, never crudely.',
  ask_out:
    'Ask them out clearly and confidently. Suggest a concrete, low-pressure plan (activity + rough time) tied to something from the chat. Make it easy to say yes or no.',
  recover_dry:
    'The conversation has gone dry. Re-energize it with a fresh, specific angle, a playful callback, or a fun question — without complaining about the dryness or double-texting desperately.',
  answer_question:
    'They asked something. Answer it directly and genuinely first, then add a little personality and bounce a related question back.',
  move_to_date:
    'Transition from texting to meeting in person. Bridge from the current topic to a specific plan; suggest swapping to a call or date naturally.',
  end_gracefully:
    'Close the conversation kindly and clearly. No guilt, no mixed signals, no trying to keep it alive. Wish them well.',
};

const TONE_BRIEFS: Record<Tone, string> = {
  confident: 'self-assured and relaxed; comfortable with pauses; never seeking approval',
  funny: 'witty, quick, observational humor drawn from the conversation',
  flirty: 'warm, teasing, a little bold — always respectful',
  calm: 'grounded, easygoing, low-pressure',
  direct: 'clear, concise, says what they mean',
  romantic: 'sincere, warm, a bit poetic without being cheesy',
};

const STYLE_BRIEFS: Record<ReplyStyle, string> = {
  confident: 'CONFIDENT — grounded and self-assured; leads the conversation without chasing.',
  playful: 'PLAYFUL — light teasing, humor, callbacks; fun to reply to.',
  direct: 'DIRECT — clear intent, minimal fluff; states interest or plans plainly.',
};

export const SYSTEM_PROMPT = `You are XpressU, a sharp, emotionally intelligent texting coach. You help the user reply to someone they are talking to on a dating app or social platform (Tinder, Hinge, Bumble, Instagram, Snapchat, WhatsApp, etc.).

YOUR JOB
1. Read the conversation carefully. Work out who said what (the user is "Me"/"You"/the person asking for help; the other person is "Them"). If speaker labels are missing, infer from context; the last message is usually from the other person.
2. Analyze: context, tone, conversation momentum, the other person's apparent engagement, any questions that still need answering, and natural openings for a follow-up.
3. Write exactly three reply options in these styles: CONFIDENT, PLAYFUL, DIRECT.
4. For each, give a one-sentence "why" explaining the specific move it makes.
5. Give a short "nextMove": what the user should do after they send a reply (e.g. what to do if they respond warmly, or if they go quiet).

HOW THE REPLIES MUST SOUND
- Like a real, socially confident person typing on their phone. Not a pickup artist, not a greeting card, not an AI.
- Short. Usually 1–2 sentences, under 180 characters unless answering a question genuinely needs more.
- Specific to THIS conversation: reference details they mentioned. Generic lines are failures.
- Confident without arrogance. Curious without interrogating. Flirty only when the other person's energy supports it.
- No canned pickup lines, no negging, no manipulation tactics, no guilt-tripping, no love-bombing.
- No over-apologizing, no neediness, no walls of text, no multiple questions in one message.
- Emojis sparingly and only if they fit the user's style.
- Never include hashtags, quotation marks around the reply, or labels like "Reply:".

RESPECT AND CONSENT (non-negotiable)
- Never assume the other person's feelings, attraction, or consent. Read what is actually there.
- If they signal disinterest, discomfort, rejection, a relationship, or ask to stop: set safety.signal to "boundary", and make ALL three replies graceful, respectful acknowledgements (or suggest not replying). Do not try to change their mind, "overcome objections", or re-open the door.
- If engagement is low (one-word answers, long gaps mentioned, no questions back): set safety.signal to "low_interest", keep replies low-pressure, and use nextMove to advise giving space rather than escalating.
- Never produce sexual content involving minors, coercive, explicit, or harassing content. If the conversation suggests a minor, set signal to "boundary" and advise disengaging.
- Do not help deceive or impersonate anyone.

OUTPUT
Return ONLY JSON matching the provided schema. Keep "why" to one sentence each. Keep "nextMove" to 1–2 sentences.`;

function describeUserStyle(style: UserStyle | null | undefined): string {
  if (!style) return 'No personal style profile. Default to natural, modern texting.';
  const parts: string[] = [];
  parts.push(`Casing: ${style.casing === 'lowercase' ? 'mostly lowercase' : 'normal capitalization'}.`);
  parts.push(`Emoji use: ${style.emoji}.`);
  parts.push(`Message length: ${style.length}.`);
  if (style.notes.trim()) parts.push(`Notes from the user: ${style.notes.trim()}`);
  if (style.samples.trim()) {
    parts.push(
      `Examples of how the user actually texts (mirror vocabulary, rhythm, punctuation; do not copy content):\n"""\n${style.samples.trim()}\n"""`,
    );
  }
  return parts.join('\n');
}

export function buildUserPrompt(req: GenerateRequest): string {
  const styles: ReplyStyle[] = req.onlyStyle ? [req.onlyStyle] : ['confident', 'playful', 'direct'];
  const avoid = (req.avoid ?? []).filter(Boolean);

  return [
    `OBJECTIVE: ${OBJECTIVE_BRIEFS[req.objective]}`,
    `USER'S PREFERRED OVERALL TONE: ${TONE_BRIEFS[req.tone]}`,
    `USER'S TEXTING STYLE:\n${describeUserStyle(req.userStyle)}`,
    `REPLY STYLES TO WRITE:\n${styles.map((s) => `- ${STYLE_BRIEFS[s]}`).join('\n')}`,
    req.onlyStyle
      ? `Only the ${req.onlyStyle.toUpperCase()} reply is needed; still return it inside "replies" (other styles may be omitted).`
      : 'Return all three styles in "replies", in the order confident, playful, direct.',
    avoid.length
      ? `DO NOT repeat or closely paraphrase these previous suggestions:\n${avoid.map((a) => `- ${a}`).join('\n')}`
      : '',
    req.includeAnalysis
      ? 'Include the full "analysis" object.'
      : 'Set "analysis" to null.',
    `CONVERSATION (most recent part; contact details may be redacted as [email]/[number]/[link]):\n"""\n${req.conversation}\n"""`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** JSON Schema for OpenAI structured outputs (strict mode). */
export const RESPONSE_JSON_SCHEMA = {
  name: 'xpressu_replies',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['replies', 'nextMove', 'analysis', 'safety'],
    properties: {
      replies: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['style', 'text', 'why'],
          properties: {
            style: { type: 'string', enum: ['confident', 'playful', 'direct'] },
            text: { type: 'string' },
            why: { type: 'string' },
          },
        },
      },
      nextMove: { type: 'string' },
      analysis: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: false,
            required: ['tone', 'momentum', 'engagement', 'questionsToAnswer', 'openings', 'summary'],
            properties: {
              tone: { type: 'string' },
              momentum: { type: 'string', enum: ['stalling', 'steady', 'building'] },
              engagement: { type: 'string', enum: ['low', 'medium', 'high', 'unclear'] },
              questionsToAnswer: { type: 'array', items: { type: 'string' } },
              openings: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' },
            },
          },
        ],
      },
      safety: {
        type: 'object',
        additionalProperties: false,
        required: ['signal', 'guidance'],
        properties: {
          signal: { type: 'string', enum: ['ok', 'low_interest', 'boundary'] },
          guidance: { type: 'string' },
        },
      },
    },
  },
} as const;

export function buildChatMessages(req: GenerateRequest) {
  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserPrompt(req) },
  ];
}
