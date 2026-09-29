/**
 * Public runtime configuration. Only EXPO_PUBLIC_* variables are available in
 * the app bundle — these must never contain secrets.
 *
 * Note: Expo inlines `process.env.EXPO_PUBLIC_X` only when accessed with
 * static dot notation, so every variable is read explicitly below.
 */
export type AiMode = 'mock' | 'backend';

const rawMode = process.env.EXPO_PUBLIC_AI_MODE?.trim().toLowerCase();
const aiEndpoint = process.env.EXPO_PUBLIC_AI_ENDPOINT?.trim() ?? '';

function resolveMode(): AiMode {
  if (rawMode === 'mock') return 'mock';
  if (rawMode === 'backend') return 'backend';
  return aiEndpoint ? 'backend' : 'mock';
}

export const env = {
  aiMode: resolveMode(),
  aiEndpoint,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ?? '',
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isMockAi = env.aiMode === 'mock';
