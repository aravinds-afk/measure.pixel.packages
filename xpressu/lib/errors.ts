import type { AppErrorCode } from '@/types';

const MESSAGES: Record<AppErrorCode, { title: string; message: string; retryable: boolean }> = {
  offline: { title: "You're offline", message: 'Reconnect to generate replies. Your text is still here.', retryable: true },
  timeout: { title: 'That took too long', message: 'The AI didn’t answer in time. Try again.', retryable: true },
  quota_exceeded: {
    title: 'Daily limit reached',
    message: 'You’ve used today’s free replies. Go Premium for unlimited, or come back tomorrow.',
    retryable: false,
  },
  rate_limited: { title: 'Busy right now', message: 'Too many requests. Give it a few seconds.', retryable: true },
  unauthorized: { title: 'Session expired', message: 'Restart the app to reconnect.', retryable: true },
  invalid_input: { title: 'Check your input', message: 'Paste at least a message or two.', retryable: false },
  invalid_response: {
    title: 'Something looked off',
    message: 'The AI returned an unexpected answer. Try regenerating.',
    retryable: true,
  },
  server: { title: 'Server error', message: 'We couldn’t generate replies. Try again in a moment.', retryable: true },
  config: {
    title: 'AI not configured',
    message: 'Set EXPO_PUBLIC_AI_ENDPOINT or switch EXPO_PUBLIC_AI_MODE to "mock".',
    retryable: false,
  },
  unknown: { title: 'Something went wrong', message: 'Try again.', retryable: true },
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly title: string;
  readonly retryable: boolean;

  constructor(code: AppErrorCode, detail?: string) {
    const meta = MESSAGES[code];
    super(meta.message);
    this.name = 'AppError';
    this.code = code;
    this.title = meta.title;
    this.retryable = meta.retryable;
    if (detail && __DEV__) console.warn(`[AppError:${code}]`, detail);
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error && err.name === 'AbortError') return new AppError('timeout');
  return new AppError('unknown', err instanceof Error ? err.message : String(err));
}
