/**
 * Data minimization applied before any conversation text leaves the device
 * (and again on the server, defensively).
 *
 * - Keeps only the most recent part of the conversation (latest messages
 *   matter most for a reply).
 * - Redacts contact details that the AI never needs: emails, phone numbers,
 *   URLs, and long digit runs (card / account numbers, codes).
 */
import { LIMITS } from './contract.ts';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
// Phone numbers: optional +country, 7+ digits, allowing separators like
// spaces, dots, dashes and parenthesized area codes: +1 (415) 555-0132.
const PHONE = /\+?\(?\d(?:[\s().-]{0,2}\d){6,}/g;
const LONG_DIGITS = /\b\d{6,}\b/g;

export function redactContactDetails(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(URL, '[link]')
    .replace(PHONE, '[number]')
    .replace(LONG_DIGITS, '[number]');
}

/** Keep the tail of the conversation, cut at a line boundary when possible. */
export function keepRecent(text: string, maxChars: number = LIMITS.conversationSentChars): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const tail = trimmed.slice(trimmed.length - maxChars);
  const firstBreak = tail.indexOf('\n');
  return firstBreak > -1 && firstBreak < 200 ? tail.slice(firstBreak + 1) : tail;
}

/** Collapse whitespace noise from copy/paste without destroying line structure. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function minimizeConversation(text: string, options: { redact: boolean }): string {
  const normalized = normalizeWhitespace(text);
  const recent = keepRecent(normalized);
  return options.redact ? redactContactDetails(recent) : recent;
}
