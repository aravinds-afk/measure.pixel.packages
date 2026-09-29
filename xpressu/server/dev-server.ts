/**
 * LOCAL DEVELOPMENT SERVER — not for production.
 *
 * Implements the same contract as the Supabase `generate-replies` function so
 * you can test real AI replies with just an OpenAI key:
 *
 *   OPENAI_API_KEY=sk-... npm run dev:server
 *   EXPO_PUBLIC_AI_MODE=backend
 *   EXPO_PUBLIC_AI_ENDPOINT=http://<your-LAN-IP>:8787/generate-replies
 *
 * No auth and no server-side quota. Conversation text is never logged.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { type ApiErrorBody, GenerateRequestSchema } from '../supabase/functions/_shared/contract.ts';
import { minimizeConversation } from '../supabase/functions/_shared/minimize.ts';
import { generateWithOpenAI, UpstreamError } from '../supabase/functions/_shared/openai.ts';

const PORT = Number(process.env.DEV_SERVER_PORT ?? 8787);
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const MAX_BODY_BYTES = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function fail(res: ServerResponse, code: ApiErrorBody['error']['code'], message: string, status: number) {
  send(res, status, { error: { code, message } } satisfies ApiErrorBody);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, undefined);
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, model: MODEL, hasKey: Boolean(API_KEY) });
  if (req.method !== 'POST' || !req.url?.startsWith('/generate-replies')) return fail(res, 'bad_request', 'Not found', 404);
  if (!API_KEY) return fail(res, 'internal', 'Set OPENAI_API_KEY before starting the dev server', 500);

  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return fail(res, 'bad_request', 'Body must be JSON (max 64KB)', 400);
  }
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return fail(res, 'bad_request', 'Invalid request', 400);

  const started = Date.now();
  try {
    const result = await generateWithOpenAI(
      { ...parsed.data, conversation: minimizeConversation(parsed.data.conversation, { redact: true }) },
      { apiKey: API_KEY, model: MODEL },
    );
    console.warn(`[dev-server] 200 in ${Date.now() - started}ms (${parsed.data.objective})`);
    send(res, 200, result);
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : 500;
    console.error(`[dev-server] upstream error ${status}: ${err instanceof Error ? err.message.slice(0, 200) : ''}`);
    if (status === 429) return fail(res, 'rate_limited', 'AI is busy, try again', 429);
    fail(res, 'upstream', 'Could not generate replies', 502);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.warn(`[dev-server] XpressU AI dev server on http://0.0.0.0:${PORT} (model: ${MODEL}, key: ${API_KEY ? 'set' : 'MISSING'})`);
});
