export { LIMITS } from '@/supabase/functions/_shared/contract.ts';

export const APP_NAME = 'XpressU';
export const TAGLINE = 'Never overthink the reply.';
export const SUPPORT_EMAIL = 'support@xpressu.app';
export const PRIVACY_POLICY_URL = 'https://xpressu.app/privacy';
export const TERMS_URL = 'https://xpressu.app/terms';
export const HISTORY_MAX_ENTRIES = 50;
export const REQUEST_TIMEOUT_MS = 30_000;

export const PREMIUM_FEATURES = [
  { title: 'Unlimited generations', body: 'No daily cap.' },
  { title: 'Advanced tones', body: 'Flirty, Direct and Romantic.' },
  { title: 'Your texting style', body: 'Replies that sound like you wrote them.' },
  { title: 'Conversation history', body: 'Encrypted on your device. Opt-in.' },
  { title: 'Advanced analysis', body: 'Engagement, momentum, open questions and openings.' },
] as const;

export const PLANS = [
  { id: 'premium_yearly', title: 'Yearly', price: '$39.99/yr', note: 'Best value · $3.33/mo' },
  { id: 'premium_monthly', title: 'Monthly', price: '$7.99/mo', note: 'Cancel anytime' },
] as const;
