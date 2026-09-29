/**
 * Authentication. XpressU uses Supabase anonymous sessions so every install
 * gets a JWT (used for server-side quota) without asking for an account.
 * Anonymous users can later be upgraded to email/Apple/Google sign-in with
 * `supabase.auth.updateUser` / `linkIdentity` without losing their data.
 *
 * When Supabase isn't configured, auth is a no-op.
 */
import { AppState } from 'react-native';

import { getSupabase } from './supabaseClient';

export interface AuthState {
  userId: string | null;
  isAnonymous: boolean;
  enabled: boolean;
}

let appStateBound = false;

function bindAutoRefresh() {
  const supabase = getSupabase();
  if (!supabase || appStateBound) return;
  appStateBound = true;
  // Only refresh tokens while the app is in the foreground.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export async function ensureSession(): Promise<AuthState> {
  const supabase = getSupabase();
  if (!supabase) return { userId: null, isAnonymous: true, enabled: false };
  bindAutoRefresh();

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return { userId: data.session.user.id, isAnonymous: data.session.user.is_anonymous ?? true, enabled: true };
  }
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signIn.user) {
    console.warn('[auth] anonymous sign-in failed', error?.message);
    return { userId: null, isAnonymous: true, enabled: true };
  }
  return { userId: signIn.user.id, isAnonymous: true, enabled: true };
}

/** Access token for the AI backend, or null when auth is disabled/unavailable. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;
  await ensureSession();
  const retry = await supabase.auth.getSession();
  return retry.data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
