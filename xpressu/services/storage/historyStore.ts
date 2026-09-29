/**
 * Opt-in, on-device conversation history. Each entry is stored encrypted
 * (SecureStore) under its own key; an index keeps the ordering.
 * Nothing here is ever uploaded.
 */
import { HISTORY_MAX_ENTRIES } from '@/constants/config';
import { preview } from '@/lib/format';
import { GenerateResponseSchema } from '@/supabase/functions/_shared/contract.ts';
import type { HistoryEntry, HistorySummary } from '@/types';

import { getJSON, removeItem, setJSON } from './secureStorage';

const INDEX_KEY = 'history.index.v1';
const entryKey = (id: string) => `history.e.${id}`;

export async function listHistory(): Promise<HistorySummary[]> {
  return (await getJSON<HistorySummary[]>(INDEX_KEY)) ?? [];
}

export async function getHistoryEntry(id: string): Promise<HistoryEntry | null> {
  const entry = await getJSON<HistoryEntry>(entryKey(id));
  if (!entry) return null;
  // Re-validate stored data before rendering.
  const ok = GenerateResponseSchema.safeParse(entry.result).success;
  return ok ? entry : null;
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<HistorySummary[]> {
  const index = await listHistory();
  const summary: HistorySummary = {
    id: entry.id,
    createdAt: entry.createdAt,
    objective: entry.objective,
    preview: preview(entry.conversation.split('\n').filter(Boolean).slice(-1)[0] ?? entry.conversation),
  };
  const next = [summary, ...index.filter((s) => s.id !== entry.id)];
  const overflow = next.slice(HISTORY_MAX_ENTRIES);
  await setJSON(entryKey(entry.id), entry);
  await setJSON(INDEX_KEY, next.slice(0, HISTORY_MAX_ENTRIES));
  await Promise.all(overflow.map((s) => removeItem(entryKey(s.id))));
  return next.slice(0, HISTORY_MAX_ENTRIES);
}

export async function updateHistoryResult(id: string, result: HistoryEntry['result']): Promise<void> {
  const entry = await getJSON<HistoryEntry>(entryKey(id));
  if (!entry) return;
  await setJSON(entryKey(id), { ...entry, result });
}

export async function deleteHistoryEntry(id: string): Promise<HistorySummary[]> {
  const next = (await listHistory()).filter((s) => s.id !== id);
  await removeItem(entryKey(id));
  await setJSON(INDEX_KEY, next);
  return next;
}

export async function clearHistory(): Promise<void> {
  const index = await listHistory();
  await Promise.all(index.map((s) => removeItem(entryKey(s.id))));
  await removeItem(INDEX_KEY);
}
