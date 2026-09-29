/**
 * ============================================================================
 *  ⚠️  MOCK AI PROVIDER — FOR DEVELOPMENT AND UI TESTING ONLY  ⚠️
 * ============================================================================
 * Generates plausible replies on-device with simple heuristics and templates
 * so the full app can be exercised without an API key or network.
 * It is NOT the real XpressU AI. Enable the real one by setting
 * EXPO_PUBLIC_AI_MODE=backend and EXPO_PUBLIC_AI_ENDPOINT (see README).
 *
 * The mock still honors the product's safety rules: boundary / rejection
 * signals always produce respectful, non-persuasive replies.
 * ============================================================================
 */
import type { Analysis, GenerateRequest, GenerateResponse, Objective, Reply, ReplyStyle, Safety, UserStyle } from '@/types';

import type { AiProvider } from './types';

const BOUNDARY_PATTERNS = [
  /not interested/i,
  /leave me alone/i,
  /(please )?stop (texting|messaging|contacting)/i,
  /\bplease stop\b/i,
  /don'?t (text|message|contact) me/i,
  /i have a (boyfriend|girlfriend|partner|husband|wife)/i,
  /i'?m (married|seeing someone|taken|in a relationship)/i,
  /\bunmatch/i,
  /\bblock(ing)? you\b/i,
  /(not |un)comfortable/i,
  /\bcreep(y)?\b/i,
  /\bgo away\b/i,
  /\bno thanks?\b/i,
];

const LOW_EFFORT = new Set(['k', 'kk', 'ok', 'okay', 'lol', 'haha', 'hahaha', 'lmao', 'cool', 'nice', 'yeah', 'ya', 'yep', 'hm', 'hmm', 'sure', 'true', 'fair', 'same', 'nm', 'nothing much', 'not much']);

const STOPWORDS = new Set(
  'about above after again against because been before being below between both could doing down during each few from further have having here hers herself himself into itself just more most myself once only other ours ourselves over same should some such than that their theirs them themselves then there these they this those through under until very were what when where which while whom why will with would your yours yourself yourselves really going thing things think know like want doing today tonight tomorrow yeah okay haha kinda gonna wanna pretty maybe'.split(
    ' ',
  ),
);

type Pick = (topic: string | null) => string;

// Each objective × style has several variants so "Regenerate" feels fresh.
const TEMPLATES: Record<Objective, Record<ReplyStyle, Pick[]>> = {
  keep_going: {
    confident: [
      (t) => (t ? `Okay, ${t} is a solid answer. What got you into that?` : 'Okay, I like where this is going. What’s been the best part of your week so far?'),
      (t) => (t ? `I’m going to need the full story behind ${t}.` : 'I feel like there’s a good story behind that. Go on.'),
      () => 'Honestly that tracks. What’s your version of a perfect Sunday?',
    ],
    playful: [
      (t) => (t ? `Wait, ${t}? Okay you just got 10% more interesting 😄` : 'Okay you just got 10% more interesting 😄'),
      (t) => (t ? `Hot take: ${t} is underrated. Defend your position.` : 'Hot take incoming… actually no, you first. Best hot take you’ve got?'),
      () => 'I’m ranking your answers so far and you’re doing suspiciously well',
    ],
    direct: [
      (t) => (t ? `I like that you’re into ${t}. How long have you been doing it?` : 'I’m enjoying talking to you. What are you up to this week?'),
      () => 'Tell me something about you that isn’t on your profile.',
      () => 'What’s something you’re genuinely excited about right now?',
    ],
  },
  flirt: {
    confident: [
      (t) => (t ? `A person who’s into ${t}? That’s a good sign for you` : 'You’re making it hard to play it cool, you know that?'),
      () => 'I had a feeling you’d be trouble. The good kind.',
      () => 'Careful, keep talking like that and I might actually like you',
    ],
    playful: [
      (t) => (t ? `Okay ${t} and a good sense of humor? Suspicious. What’s the catch 😏` : 'Okay, cute and funny? What’s the catch 😏'),
      () => 'I’m trying to find a flaw and so far I’ve got nothing. Help me out',
      () => 'You’re lucky I’m bad at hiding when I’m smiling at my phone',
    ],
    direct: [
      () => 'I’ll be honest, I’m into this conversation. And you.',
      (t) => (t ? `Not going to lie, the ${t} thing made you even more attractive` : 'Not going to lie, you’re really easy to talk to. I like it.'),
      () => 'I like your vibe. A lot.',
    ],
  },
  ask_out: {
    confident: [
      (t) => (t ? `We should continue this over drinks. You pick the place, I’ll bring the ${t} opinions. Thursday?` : 'We should continue this in person. Drinks this Thursday?'),
      () => 'I think this conversation deserves an upgrade. Coffee this weekend?',
      () => 'Let’s do this properly. Drinks Friday, 7?',
    ],
    playful: [
      (t) => (t ? `Proposal: we settle the ${t} debate in person. Loser buys the first round 😄` : 'Proposal: we take this offline. Loser of the next debate buys the first round 😄'),
      () => 'I’m told I’m even better in person. Want to fact-check that over a drink?',
      () => 'Okay this is going well enough that I’m risking it: tacos this week?',
    ],
    direct: [
      () => 'I’d like to take you out. Are you free this week?',
      () => 'Want to grab a drink this week? I know a good spot.',
      () => 'Let’s meet. Wednesday or Saturday work for you?',
    ],
  },
  recover_dry: {
    confident: [
      () => 'New rule: we skip the small talk. Best thing that happened to you this week — go.',
      () => 'Okay let’s liven this up. What’s something you’d do if you had zero responsibilities tomorrow?',
      (t) => (t ? `Different question: what’s the most spontaneous thing you’ve done lately? Bonus points if it involves ${t}` : 'Different question: what’s the most spontaneous thing you’ve done lately?'),
    ],
    playful: [
      () => 'Quick, pineapple on pizza: yes or no. This decides everything.',
      () => 'I feel like we’re in the boring part of the movie. Let’s skip to the good scene',
      () => 'Would you rather: never use your phone again or only speak in movie quotes?',
    ],
    direct: [
      () => 'I feel like texting isn’t doing us justice. Want to grab a coffee instead?',
      () => 'Tell me something you’re actually excited about right now.',
      () => 'I’d rather hear about your day properly. What was the highlight?',
    ],
  },
  answer_question: {
    confident: [
      (t) => (t ? `Honestly? ${capitalize(t)} is a big part of it. What about you?` : 'Honestly? Good question. Short version: I’m having a great week. You?'),
      () => 'Straight answer: yes. Now I’m curious why you asked',
      () => 'Good question. I’ll tell you, but you have to answer it too.',
    ],
    playful: [
      () => 'That’s classified… okay fine, I’ll tell you. But you owe me one answer back',
      (t) => (t ? `Depends. Is this a ${t} trap? Because I’m walking right into it` : 'Is this a trick question? Because I’m walking right into it'),
      () => 'I was hoping you’d ask that. What’s your answer?',
    ],
    direct: [
      () => 'Yes — and I’m glad you asked. What made you curious?',
      (t) => (t ? `Short answer: ${t}. Long answer is better in person.` : 'Short answer: yes. Long answer is better in person.'),
      () => 'Honestly, a bit of both. What about you?',
    ],
  },
  move_to_date: {
    confident: [
      (t) => (t ? `This ${t} conversation needs a proper setting. Drinks this week?` : 'I think we’ve passed the texting test. Drinks this week?'),
      () => 'I’d rather hear the rest of this in person. When are you free?',
      () => 'Let’s swap the texting for a real conversation. Thursday?',
    ],
    playful: [
      () => 'I feel like we’ve earned an in-person episode. Coffee or cocktails?',
      (t) => (t ? `Counteroffer: we continue the ${t} discussion over tacos` : 'Counteroffer: we continue this over tacos'),
      () => 'My texting game is okay but my in-person game is better. Let me prove it?',
    ],
    direct: [
      () => 'I like talking to you. Want to meet up this week?',
      () => 'Let’s grab a drink. Does Friday work?',
      () => 'Can I take you out this weekend?',
    ],
  },
  end_gracefully: {
    confident: [
      () => 'I’ve enjoyed chatting, but I don’t think we’re a match. Wishing you the best.',
      () => 'Really appreciate the conversation. I don’t feel the spark, so I’ll bow out here. Take care!',
      () => 'I want to be upfront: I don’t see this going further. Good luck out there!',
    ],
    playful: [
      () => 'This was fun, but I think we’re better as a great conversation than a couple. Good luck out there 🙂',
      () => 'I’m going to tap out here, but thanks for the good chat. Hope you find someone great',
      () => 'Calling it here — thanks for the laughs though. Take care!',
    ],
    direct: [
      () => 'I don’t think we’re a fit, so I’ll leave it here. Take care.',
      () => 'I’m going to step back from this. Thanks for chatting.',
      () => 'I’m not feeling a romantic connection. Wish you well!',
    ],
  },
};

const BOUNDARY_REPLIES: Record<ReplyStyle, string[]> = {
  confident: ['Totally understood. Take care!', 'All good — thanks for letting me know. Wishing you the best.'],
  playful: ['No worries at all. Good luck out there 🙂', 'Understood! Have a good one.'],
  direct: ['Got it, I’ll leave it here. Take care.', 'Understood. I won’t message again.'],
};

const WHY: Record<ReplyStyle, (objective: Objective, hasQuestion: boolean) => string> = {
  confident: (o, q) =>
    o === 'end_gracefully'
      ? 'Clear and kind — it closes the door without drama or mixed signals.'
      : q
        ? 'Answers their question without over-explaining, then leads the conversation forward.'
        : 'Relaxed and self-assured: it shows interest without chasing or seeking approval.',
  playful: (o) =>
    o === 'end_gracefully'
      ? 'Keeps it light so nobody feels bad, while still being clear.'
      : 'Light teasing creates energy and gives them something fun and easy to reply to.',
  direct: (o) =>
    o === 'ask_out' || o === 'move_to_date'
      ? 'A specific, low-pressure plan is easy to say yes to — and easy to decline.'
      : o === 'end_gracefully'
        ? 'Honest and brief. Respects both your time and theirs.'
        : 'Clear intent is attractive. It shows genuine curiosity without games.',
};

const NEXT_MOVE: Record<Objective, string> = {
  keep_going: 'If they answer with energy, match it and look for a chance to suggest meeting. If they go short, don’t double-text — give it space.',
  flirt: 'If they flirt back, keep the momentum and suggest a plan. If they ignore the flirt, dial it back and stay friendly.',
  ask_out: 'If they say yes, lock in a day and place within the next message or two. If they’re vague, offer one alternative, then let it be.',
  recover_dry: 'Send one message, then wait. If it stays dry after this, it’s okay to let it go — interest should be mutual.',
  answer_question: 'Once they reply to your question, pick up on a detail and build on it. Aim to suggest meeting within a few exchanges.',
  move_to_date: 'If they’re in, confirm specifics (day, time, place) right away. If they deflect, don’t push — try once more later or move on.',
  end_gracefully: 'Send it and leave it. No need to follow up or explain further.',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stripSpeaker(line: string): string {
  return line.replace(/^\s*[\p{L}\p{N} ._-]{1,20}:\s*/u, '').trim();
}

function lastTheirMessage(conversation: string): string {
  const lines = conversation.split('\n').map((l) => l.trim()).filter(Boolean);
  // Prefer the last line not labeled as the user.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!/^\s*(me|you|i)\s*:/i.test(line)) return stripSpeaker(line);
  }
  return stripSpeaker(lines[lines.length - 1] ?? '');
}

function extractTopic(message: string): string | null {
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w) && !w.includes('[') && !/(ly|ed)$/.test(w));
  if (!words.length) return null;
  return words.sort((a, b) => b.length - a.length)[0] ?? null;
}

function detectSignal(conversation: string, lastMessage: string): Safety['signal'] {
  const recent = conversation.slice(-600);
  if (BOUNDARY_PATTERNS.some((p) => p.test(recent))) return 'boundary';
  const normalized = lastMessage.toLowerCase().replace(/[^a-z ]/g, '').trim();
  if (LOW_EFFORT.has(normalized) || normalized.length <= 3) return 'low_interest';
  return 'ok';
}

function applyUserStyle(text: string, style: UserStyle | null | undefined): string {
  if (!style) return text;
  let out = text;
  if (style.emoji === 'never') out = out.replace(/\s*\p{Extended_Pictographic}/gu, '').trim();
  if (style.emoji === 'often' && !/\p{Extended_Pictographic}/u.test(out)) out = `${out} 😄`;
  if (style.casing === 'lowercase') out = out.toLowerCase();
  return out;
}

function choose<T>(items: T[], avoid: (item: T) => boolean): T {
  const fresh = items.filter((i) => !avoid(i));
  const pool = fresh.length ? fresh : items;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function buildAnalysis(conversation: string, lastMessage: string, signal: Safety['signal']): Analysis {
  const lines = conversation.split('\n').filter((l) => l.trim());
  const questions = lastMessage.includes('?') ? [lastMessage.slice(0, 180)] : [];
  const topic = extractTopic(lastMessage);
  return {
    tone: signal === 'boundary' ? 'Closed / setting a boundary' : signal === 'low_interest' ? 'Low-effort, neutral' : 'Friendly and open',
    momentum: signal === 'ok' ? (lines.length > 6 ? 'building' : 'steady') : 'stalling',
    engagement: signal === 'boundary' ? 'low' : signal === 'low_interest' ? 'low' : lastMessage.length > 40 ? 'high' : 'medium',
    questionsToAnswer: questions,
    openings: signal === 'ok' && topic ? [`Ask about "${topic}" — it’s the most specific detail in their last message.`] : [],
    summary:
      signal === 'boundary'
        ? 'They’ve signaled they don’t want to continue. Respect it.'
        : signal === 'low_interest'
          ? 'Short replies suggest limited engagement right now. Keep it light and don’t over-invest.'
          : 'The conversation is open. Build on specifics and look for a natural moment to suggest meeting.',
  };
}

export function generateMockResponse(request: GenerateRequest): GenerateResponse {
  const lastMessage = lastTheirMessage(request.conversation);
  const signal = detectSignal(request.conversation, lastMessage);
  const topic = extractTopic(lastMessage);
  const hasQuestion = lastMessage.includes('?');
  const avoid = new Set((request.avoid ?? []).map((a) => a.toLowerCase()));

  // A question takes priority over "keep going" — answer it first.
  const objective: Objective = request.objective === 'keep_going' && hasQuestion ? 'answer_question' : request.objective;
  const styles: ReplyStyle[] = request.onlyStyle ? [request.onlyStyle] : ['confident', 'playful', 'direct'];

  const replies: Reply[] = styles.map((style) => {
    if (signal === 'boundary') {
      const text = choose(BOUNDARY_REPLIES[style], (t) => avoid.has(t.toLowerCase()));
      return { style, text: applyUserStyle(text, request.userStyle), why: 'They set a boundary. A short, gracious acknowledgement is the right move — no persuading.' };
    }
    const template = choose(TEMPLATES[objective][style], (fn) => avoid.has(applyUserStyle(fn(topic), request.userStyle).toLowerCase()));
    return { style, text: applyUserStyle(template(topic), request.userStyle), why: WHY[style](objective, hasQuestion) };
  });

  const safety: Safety =
    signal === 'boundary'
      ? { signal, guidance: 'They’ve asked for space or said no. The respectful move is to acknowledge it once — or simply not reply.' }
      : signal === 'low_interest'
        ? { signal, guidance: 'Their replies are short. Don’t over-invest; one light message, then give it space.' }
        : { signal, guidance: '' };

  return {
    replies,
    nextMove:
      signal === 'boundary'
        ? 'Don’t follow up. Respecting a boundary is always the right call.'
        : signal === 'low_interest'
          ? 'If the next reply is short too, let it go and put your energy into conversations that are mutual.'
          : NEXT_MOVE[objective],
    analysis: request.includeAnalysis ? buildAnalysis(request.conversation, lastMessage, signal) : null,
    safety,
  };
}

export const mockProvider: AiProvider = {
  name: 'mock',
  isMock: true,
  async generate(request, { signal }) {
    // Simulate network latency so loading states are visible.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 900 + Math.random() * 700);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
    return generateMockResponse(request);
  },
};
