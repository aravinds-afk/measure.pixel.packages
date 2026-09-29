/**
 * POST /functions/v1/revenuecat-webhook
 *
 * Placeholder for RevenueCat server-to-server events. When RevenueCat is
 * integrated, configure its webhook to call this function with the shared
 * secret in the Authorization header. It flips `profiles.is_premium`, which
 * the `consume_generation` RPC uses to lift the daily limit.
 *
 * Secrets: REVENUECAT_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY (auto-injected).
 * Deploy with: supabase functions deploy revenuecat-webhook --no-verify-jwt
 */
import { createClient } from '@supabase/supabase-js';

const ACTIVE_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE']);
const INACTIVE_EVENTS = new Set(['EXPIRATION', 'BILLING_ISSUE']);

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }
  const payload = (await req.json().catch(() => null)) as { event?: { type?: string; app_user_id?: string } } | null;
  const type = payload?.event?.type;
  const userId = payload?.event?.app_user_id;
  if (!type || !userId) return new Response('ignored', { status: 200 });

  const isPremium = ACTIVE_EVENTS.has(type) ? true : INACTIVE_EVENTS.has(type) ? false : null;
  if (isPremium === null) return new Response('ignored', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.from('profiles').upsert({ id: userId, is_premium: isPremium, updated_at: new Date().toISOString() });
  if (error) return new Response('db error', { status: 500 });
  return new Response('ok', { status: 200 });
});
