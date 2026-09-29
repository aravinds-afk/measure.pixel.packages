import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env, isSupabaseConfigured } from '@/lib/env';
import { getString, removeItem, setString } from '@/services/storage/secureStorage';

/** Session tokens are persisted in encrypted storage, not AsyncStorage. */
const secureAuthStorage = {
  getItem: (key: string) => getString(`sb.${key}`),
  setItem: (key: string, value: string) => setString(`sb.${key}`, value),
  removeItem: (key: string) => removeItem(`sb.${key}`),
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: secureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  }
  return client;
}
