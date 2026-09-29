/**
 * Calls the secure XpressU backend (Supabase Edge Function or the local dev
 * server). The OpenAI key lives only on the server.
 */
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { getAccessToken } from '@/services/auth/authService';
import { ApiErrorSchema } from '@/supabase/functions/_shared/contract.ts';

import type { AiProvider } from './types';

export const backendProvider: AiProvider = {
  name: 'backend',
  isMock: false,
  async generate(request, { signal }) {
    if (!env.aiEndpoint) throw new AppError('config', 'EXPO_PUBLIC_AI_ENDPOINT is empty');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (env.supabaseAnonKey) headers.apikey = env.supabaseAnonKey;

    let res: Response;
    try {
      res = await fetch(env.aiEndpoint, { method: 'POST', headers, body: JSON.stringify(request), signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      throw new AppError('server', err instanceof Error ? err.message : 'network error');
    }

    const body: unknown = await res.json().catch(() => null);
    if (res.ok) return body;

    const apiError = ApiErrorSchema.safeParse(body);
    const code = apiError.success ? apiError.data.error.code : null;
    if (code === 'quota_exceeded') throw new AppError('quota_exceeded');
    if (code === 'rate_limited' || res.status === 429) throw new AppError('rate_limited');
    if (code === 'unauthorized' || res.status === 401) throw new AppError('unauthorized');
    if (code === 'bad_request') throw new AppError('invalid_input');
    throw new AppError('server', `HTTP ${res.status}`);
  },
};
