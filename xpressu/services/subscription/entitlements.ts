import { isPremiumTone } from '@/constants/tones';
import type { Tone } from '@/types';

/** Central place for every premium gate in the app. */
export const entitlements = {
  unlimitedGenerations: (isPremium: boolean) => isPremium,
  canUseTone: (tone: Tone, isPremium: boolean) => isPremium || !isPremiumTone(tone),
  canUseStyleProfile: (isPremium: boolean) => isPremium,
  canSaveHistory: (isPremium: boolean) => isPremium,
  advancedAnalysis: (isPremium: boolean) => isPremium,
} as const;
