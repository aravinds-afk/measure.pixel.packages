import { UserStyleSchema } from '@/supabase/functions/_shared/contract.ts';
import type { Preferences, UserStyle } from '@/types';

import { getJSON, setJSON } from './secureStorage';

const PREFS_KEY = 'prefs.v1';
const STYLE_KEY = 'style.v1';

export const DEFAULT_PREFERENCES: Preferences = {
  onboarded: false,
  tone: 'confident',
  defaultObjective: 'keep_going',
  saveHistory: false,
  redactContactInfo: true,
  haptics: true,
  useStyleProfile: true,
};

export const DEFAULT_USER_STYLE: UserStyle = {
  samples: '',
  emoji: 'sometimes',
  casing: 'normal',
  length: 'short',
  notes: '',
};

export async function loadPreferences(): Promise<Preferences> {
  const stored = await getJSON<Partial<Preferences>>(PREFS_KEY);
  return { ...DEFAULT_PREFERENCES, ...(stored ?? {}) };
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await setJSON(PREFS_KEY, prefs);
}

export async function loadUserStyle(): Promise<UserStyle> {
  const stored = await getJSON<unknown>(STYLE_KEY);
  const parsed = UserStyleSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : DEFAULT_USER_STYLE;
}

export async function saveUserStyle(style: UserStyle): Promise<void> {
  await setJSON(STYLE_KEY, style);
}

export function hasStyleProfile(style: UserStyle): boolean {
  return Boolean(style.samples.trim() || style.notes.trim()) || style.casing === 'lowercase' || style.emoji !== 'sometimes';
}
