/**
 * XpressU AI service — the only entry point the UI uses.
 *
 *   generateReplies({ conversation, objective, tone, userStyle })
 *
 * 1. Validates input.
 * 2. Minimizes data (recent messages only, contact details redacted).
 * 3. Calls the configured provider (secure backend, or the mock).
 * 4. Validates the response against the shared zod contract before returning.
 */
import { REQUEST_TIMEOUT_MS } from '@/constants/config';
import { env } from '@/lib/env';
import { AppError, toAppError } from '@/lib/errors';
import { minimizeConversation } from '@/lib/minimize';
import {
  GenerateRequestSchema,
  LIMITS,
  parseGenerateResponse,
} from '@/supabase/functions/_shared/contract.ts';
import type { GenerateRequest, GenerateResponse, Objective, ReplyStyle, Tone, UserStyle } from '@/types';

import { backendProvider } from './backendProvider';
import { mockProvider } from './mockProvider';
import type { AiProvider } from './types';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

export const aiProvider: AiProvider = env.aiMode === 'mock' ? mockProvider : backendProvider;

export interface GenerateRepliesInput {
  conversation: string;
  objective: Objective;
  tone: Tone;
  userStyle?: UserStyle | null;
  onlyStyle?: ReplyStyle;
  avoid?: string[];
  includeAnalysis?: boolean;
  redactContactInfo?: boolean;
  signal?: AbortSignal;
}

export interface GenerateRepliesResult {
  response: GenerateResponse;
  /** The minimized conversation that was actually sent. */
  sentConversation: string;
}

export async function generateReplies(input: GenerateRepliesInput): Promise<GenerateRepliesResult> {
  const sentConversation = minimizeConversation(input.conversation, { redact: input.redactContactInfo ?? true });

  const request: GenerateRequest = {
    conversation: sentConversation,
    objective: input.objective,
    tone: input.tone,
    userStyle: input.userStyle ?? null,
    onlyStyle: input.onlyStyle,
    avoid: input.avoid?.slice(0, 9).map((a) => a.slice(0, LIMITS.replyMaxChars)),
    includeAnalysis: input.includeAnalysis ?? false,
  };
  const validRequest = GenerateRequestSchema.safeParse(request);
  if (!validRequest.success) throw new AppError('invalid_input', validRequest.error.message);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  input.signal?.addEventListener('abort', onExternalAbort);

  try {
    const payload = await aiProvider.generate(validRequest.data, { signal: controller.signal });
    const parsed = parseGenerateResponse(payload, { onlyStyle: input.onlyStyle });
    if (!parsed.ok) throw new AppError('invalid_response', parsed.error);
    return { response: parsed.data, sentConversation };
  } catch (err) {
    // A caller-initiated cancel is not an error the UI should display.
    if (input.signal?.aborted) throw new CancelledError();
    throw toAppError(err);
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', onExternalAbort);
  }
}
