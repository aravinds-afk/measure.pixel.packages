/**
 * Minimal OpenAI Chat Completions client (fetch-based; runs on Deno and Node).
 * Server-side only — the API key never reaches the mobile app.
 */
import { type GenerateRequest, type GenerateResponse, parseGenerateResponse } from './contract.ts';
import { buildChatMessages, RESPONSE_JSON_SCHEMA } from './prompt.ts';

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

async function requestOnce(req: GenerateRequest, config: OpenAIConfig): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 25_000);
  try {
    const res = await fetch(`${config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildChatMessages(req),
        temperature: req.avoid?.length ? 1.0 : 0.85,
        max_tokens: 900,
        response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
        // Don't let OpenAI retain conversation content for training.
        store: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new UpstreamError(`OpenAI ${res.status}: ${body.slice(0, 300)}`, res.status);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string | null; refusal?: string | null } }[];
    };
    const message = json.choices?.[0]?.message;
    if (message?.refusal) throw new UpstreamError(`Model refused: ${message.refusal}`, 422);
    if (!message?.content) throw new UpstreamError('Empty model response', 502);
    return JSON.parse(message.content);
  } finally {
    clearTimeout(timer);
  }
}

/** Calls the model and validates the output; retries once on invalid output. */
export async function generateWithOpenAI(req: GenerateRequest, config: OpenAIConfig): Promise<GenerateResponse> {
  let lastError = 'unknown';
  for (let attempt = 0; attempt < 2; attempt++) {
    let payload: unknown;
    try {
      payload = await requestOnce(req, config);
    } catch (err) {
      if (err instanceof UpstreamError && err.status < 500 && err.status !== 422 && err.status !== 429) throw err;
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }
    const parsed = parseGenerateResponse(payload, { onlyStyle: req.onlyStyle });
    if (parsed.ok) return parsed.data;
    lastError = `Invalid model output: ${parsed.error}`;
  }
  throw new UpstreamError(lastError, 502);
}
