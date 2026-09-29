import type { GenerateResponse, Objective, Tone } from '@/supabase/functions/_shared/contract.ts';

export type {
  Analysis,
  GenerateRequest,
  GenerateResponse,
  Objective,
  Reply,
  ReplyStyle,
  Safety,
  SafetySignal,
  Tone,
  UserStyle,
} from '@/supabase/functions/_shared/contract.ts';

export interface Preferences {
  onboarded: boolean;
  tone: Tone;
  defaultObjective: Objective;
  /** Opt-in. Conversations are not stored unless this is true. */
  saveHistory: boolean;
  /** Redact emails/phones/links before sending to the AI. */
  redactContactInfo: boolean;
  haptics: boolean;
  /** Use the "How I normally text" profile when generating. */
  useStyleProfile: boolean;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  objective: Objective;
  tone: Tone;
  /** Minimized conversation (what was actually sent). */
  conversation: string;
  result: GenerateResponse;
}

export interface HistorySummary {
  id: string;
  createdAt: number;
  objective: Objective;
  preview: string;
}

export type AppErrorCode =
  | 'offline'
  | 'timeout'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'unauthorized'
  | 'invalid_input'
  | 'invalid_response'
  | 'server'
  | 'config'
  | 'unknown';

export type PlanId = 'premium_monthly' | 'premium_yearly';

export interface SubscriptionStatus {
  isPremium: boolean;
  plan: PlanId | null;
  expiresAt: number | null;
  /** Where the status came from (e.g. "mock", "revenuecat"). */
  source: string;
}
