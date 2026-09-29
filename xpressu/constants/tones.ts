import type { ReplyStyle, Tone } from '@/types';

export interface ToneOption {
  id: Tone;
  label: string;
  description: string;
  premium: boolean;
}

export const TONE_OPTIONS: ToneOption[] = [
  { id: 'confident', label: 'Confident', description: 'Relaxed, self-assured, never chasing', premium: false },
  { id: 'funny', label: 'Funny', description: 'Witty and observational', premium: false },
  { id: 'calm', label: 'Calm', description: 'Easygoing and low-pressure', premium: false },
  { id: 'flirty', label: 'Flirty', description: 'Warm, teasing, a little bold', premium: true },
  { id: 'direct', label: 'Direct', description: 'Clear intent, no fluff', premium: true },
  { id: 'romantic', label: 'Romantic', description: 'Sincere and warm', premium: true },
];

export function isPremiumTone(tone: Tone): boolean {
  return TONE_OPTIONS.find((t) => t.id === tone)?.premium ?? false;
}

export const REPLY_STYLE_META: Record<ReplyStyle, { label: string; tagline: string }> = {
  confident: { label: 'CONFIDENT', tagline: 'Grounded. Leads without chasing.' },
  playful: { label: 'PLAYFUL', tagline: 'Light, teasing, fun to answer.' },
  direct: { label: 'DIRECT', tagline: 'Clear intent. Zero fluff.' },
};
