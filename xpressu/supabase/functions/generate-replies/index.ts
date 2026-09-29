/**
 * POST /functions/v1/generate-replies
 *
 * Secure proxy between the XpressU app and OpenAI.
 *  - Requires a Supabase JWT (anonymous sessions are fine).
 *  - Enforces the free-tier daily quota server-side (consume_generation RPC).
 *  - Re-applies data minimization, then calls OpenAI with a strict JSON schema.
 *  - Validates the model output before returning it.
 *  - Never logs or stores conversation text.
 *
 * Secrets (set with `supabase secrets set`): OPENAI_API_KEY, OPENAI_MODEL (optional).
 * SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.
 */
import { createClient } from '@supabase/supabase-js';
import { type ApiErrorBody, GenerateRequestSchema, LIMITS } from '../_shared/contract.ts';
import { minimizeConversation } from '../_shared/minimize.ts';
import { generateWithOpenAI, UpstreamError } from '../_shared/openai.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function fail(code: ApiErrorBody['error']['code'], message: string, status: number): Response {
  return json({ error: { code, message } } satisfies ApiErrorBody, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('bad_request', 'Use POST', 405);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return fail('internal', 'Server is missing OPENAI_API_KEY', 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return fail('unauthorized', 'Missing Authorization header', 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail('unauthorized', 'Invalid session', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('bad_request', 'Body must be JSON', 400);
  }
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return fail('bad_request', 'Invalid request', 400);

  // Server-side quota (premium users are unlimited; see migrations).
  const { data: quota, error: quotaError } = await supabase.rpc('consume_generation', {
    p_free_limit: LIMITS.freeDailyGenerations,
  });
  if (quotaError) return fail('internal', 'Quota check failed', 500);
  const quotaRow = Array.isArray(quota) ? quota[0] : quota;
  if (quotaRow && quotaRow.allowed === false) {
    return fail('quota_exceeded', 'Daily free limit reached', 429);
  }

  const request = {
    ...parsed.data,
    conversation: minimizeConversation(parsed.data.conversation, { redact: true }),
    // Advanced analysis is a premium feature.
    includeAnalysis: Boolean(parsed.data.includeAnalysis && quotaRow?.is_premium),
  };

  try {
    const result = await generateWithOpenAI(request, {
      apiKey,
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini',
    });
    return json({ ...result, analysis: request.includeAnalysis ? (result.analysis ?? null) : null });
  } catch (err) {
    // Log only metadata — never conversation content.
    console.error('generate-replies failed', err instanceof UpstreamError ? err.status : 'unknown');
    await supabase.rpc('refund_generation');
    if (err instanceof UpstreamError && err.status === 429) return fail('rate_limited', 'AI is busy, try again', 429);
    return fail('upstream', 'Could not generate replies', 502);
  }
});
