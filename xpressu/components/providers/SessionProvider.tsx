/**
 * The current reply session: the pasted draft, the chosen objective, and the
 * generated result (with per-card regenerate + user edits).
 *
 * The draft lives in memory only — it is never persisted unless the user has
 * opted in to history, in which case the minimized conversation is saved
 * encrypted on-device.
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AppError, toAppError } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { createId } from '@/lib/id';
import { CancelledError, generateReplies } from '@/services/ai';
import * as historyStore from '@/services/storage/historyStore';
import { hasStyleProfile } from '@/services/storage/preferencesStore';
import { entitlements } from '@/services/subscription';
import type { GenerateResponse, HistoryEntry, Objective, ReplyStyle, Tone } from '@/types';

import { useApp } from './AppProvider';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  response: GenerateResponse | null;
  error: AppError | null;
  /** Styles currently being regenerated individually. */
  regenerating: ReplyStyle[];
  /** User edits to reply text, keyed by style. */
  edits: Partial<Record<ReplyStyle, string>>;
  historyId: string | null;
  objective: Objective;
  tone: Tone;
  sentConversation: string;
}

interface SessionContextValue {
  draft: string;
  setDraft: (text: string) => void;
  objective: Objective;
  setObjective: (objective: Objective) => void;
  clearDraft: () => void;
  generation: GenerationState;
  generate: () => Promise<boolean>;
  regenerateAll: () => Promise<void>;
  regenerateOne: (style: ReplyStyle) => Promise<void>;
  editReply: (style: ReplyStyle, text: string) => void;
  resetEdit: (style: ReplyStyle) => void;
  loadFromHistory: (entry: HistoryEntry) => void;
  cancel: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const INITIAL: GenerationState = {
  status: 'idle',
  response: null,
  error: null,
  regenerating: [],
  edits: {},
  historyId: null,
  objective: 'keep_going',
  tone: 'confident',
  sentConversation: '',
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const [draft, setDraft] = useState('');
  const [objective, setObjective] = useState<Objective>(app.preferences.defaultObjective);
  const [generation, setGeneration] = useState<GenerationState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const defaultObjective = app.preferences.defaultObjective;

  // Apply the saved default goal once preferences load (and when it changes),
  // unless the user is mid-draft.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    if (!draftRef.current) setObjective(defaultObjective);
  }, [defaultObjective, app.ready]);
  const generationRef = useRef(generation);
  useEffect(() => {
    generationRef.current = generation;
  }, [generation]);

  const effectiveTone = useCallback((): Tone => {
    const tone = app.preferences.tone;
    return entitlements.canUseTone(tone, app.isPremium) ? tone : 'confident';
  }, [app.preferences.tone, app.isPremium]);

  const styleForRequest = useCallback(() => {
    if (!app.preferences.useStyleProfile || !entitlements.canUseStyleProfile(app.isPremium)) return null;
    return hasStyleProfile(app.userStyle) ? app.userStyle : null;
  }, [app.preferences.useStyleProfile, app.isPremium, app.userStyle]);

  const guardQuota = useCallback(() => {
    if (!app.canGenerate) throw new AppError('quota_exceeded');
  }, [app.canGenerate]);

  /** Returns null for user cancellation (nothing to show). */
  const handleError = useCallback(
    (err: unknown): AppError | null => {
      if (err instanceof CancelledError) return null;
      const appError = toAppError(err);
      if (appError.code === 'quota_exceeded') void app.markQuotaExhausted();
      haptics.warning();
      return appError;
    },
    [app],
  );

  const run = useCallback(
    async (params: {
      conversation: string;
      objective: Objective;
      tone: Tone;
      onlyStyle?: ReplyStyle;
      avoid?: string[];
    }) => {
      const controller = new AbortController();
      // Full generations replace each other; single-card regenerations run side by side.
      if (!params.onlyStyle) {
        abortRef.current?.abort();
        abortRef.current = controller;
      }
      guardQuota();
      const result = await generateReplies({
        ...params,
        userStyle: styleForRequest(),
        includeAnalysis: entitlements.advancedAnalysis(app.isPremium),
        redactContactInfo: app.preferences.redactContactInfo,
        signal: controller.signal,
      });
      await app.recordGeneration();
      return result;
    },
    [app, guardQuota, styleForRequest],
  );

  const persist = useCallback(
    async (state: GenerationState, response: GenerateResponse) => {
      if (!app.historyEnabled) return null;
      try {
        if (state.historyId) {
          await historyStore.updateHistoryResult(state.historyId, response);
          return state.historyId;
        }
        const entry: HistoryEntry = {
          id: createId(),
          createdAt: Date.now(),
          objective: state.objective,
          tone: state.tone,
          conversation: state.sentConversation,
          result: response,
        };
        await historyStore.addHistoryEntry(entry);
        await app.refreshHistory();
        return entry.id;
      } catch (err) {
        console.warn('[history] save failed', err);
        return null;
      }
    },
    [app],
  );

  const generate = useCallback(async () => {
    const tone = effectiveTone();
    setGeneration({ ...INITIAL, status: 'loading', objective, tone });
    try {
      const { response, sentConversation } = await run({ conversation: draft, objective, tone });
      const next: GenerationState = { ...INITIAL, status: 'success', response, objective, tone, sentConversation };
      const historyId = await persist(next, response);
      setGeneration({ ...next, historyId });
      haptics.success();
      return true;
    } catch (err) {
      const error = handleError(err);
      if (!error) return false;
      setGeneration({ ...INITIAL, status: 'error', error, objective, tone });
      return false;
    }
  }, [draft, objective, effectiveTone, run, persist, handleError]);

  const regenerateAll = useCallback(async () => {
    const current = generationRef.current;
    const conversation = current.sentConversation || draft;
    const avoid = current.response?.replies.map((r) => r.text) ?? [];
    const tone = effectiveTone();
    setGeneration((g) => ({ ...g, status: 'loading', error: null, tone }));
    try {
      const { response } = await run({ conversation, objective: current.objective, tone, avoid });
      const next: GenerationState = { ...current, status: 'success', response, edits: {}, error: null, tone, regenerating: [] };
      const historyId = await persist(next, response);
      setGeneration({ ...next, historyId: historyId ?? next.historyId });
      haptics.success();
    } catch (err) {
      const error = handleError(err);
      if (!error) return;
      setGeneration((g) => ({ ...g, status: g.response ? 'success' : 'error', error }));
    }
  }, [draft, effectiveTone, run, persist, handleError]);

  const regenerateOne = useCallback(
    async (style: ReplyStyle) => {
      const current = generationRef.current;
      if (!current.response) return;
      const previous = current.response.replies.find((r) => r.style === style);
      setGeneration((g) => ({ ...g, regenerating: [...g.regenerating, style], error: null }));
      try {
        const { response } = await run({
          conversation: current.sentConversation || draft,
          objective: current.objective,
          tone: current.tone,
          onlyStyle: style,
          avoid: previous ? [previous.text] : [],
        });
        const fresh = response.replies[0];
        const replace = (res: GenerateResponse): GenerateResponse =>
          fresh ? { ...res, replies: res.replies.map((r) => (r.style === style ? fresh : r)) } : res;
        setGeneration((g) => {
          const edits = { ...g.edits };
          delete edits[style];
          return {
            ...g,
            response: g.response ? replace(g.response) : g.response,
            edits,
            regenerating: g.regenerating.filter((s) => s !== style),
          };
        });
        const historyId = await persist(current, replace(current.response));
        if (historyId && !current.historyId) setGeneration((g) => ({ ...g, historyId }));
        haptics.success();
      } catch (err) {
        const error = handleError(err);
        setGeneration((g) => ({ ...g, error: error ?? g.error, regenerating: g.regenerating.filter((s) => s !== style) }));
      }
    },
    [draft, run, persist, handleError],
  );

  const editReply = useCallback((style: ReplyStyle, text: string) => {
    setGeneration((g) => ({ ...g, edits: { ...g.edits, [style]: text } }));
  }, []);

  const resetEdit = useCallback((style: ReplyStyle) => {
    setGeneration((g) => {
      const edits = { ...g.edits };
      delete edits[style];
      return { ...g, edits };
    });
  }, []);

  const clearDraft = useCallback(() => {
    abortRef.current?.abort();
    setDraft('');
    setObjective(defaultObjective);
    setGeneration(INITIAL);
  }, [defaultObjective]);

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setGeneration({
      ...INITIAL,
      status: 'success',
      response: entry.result,
      historyId: entry.id,
      objective: entry.objective,
      tone: entry.tone,
      sentConversation: entry.conversation,
    });
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setGeneration((g) => (g.status === 'loading' ? { ...g, status: g.response ? 'success' : 'idle' } : g));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      draft,
      setDraft,
      objective,
      setObjective,
      clearDraft,
      generation,
      generate,
      regenerateAll,
      regenerateOne,
      editReply,
      resetEdit,
      loadFromHistory,
      cancel,
    }),
    [draft, objective, clearDraft, generation, generate, regenerateAll, regenerateOne, editReply, resetEdit, loadFromHistory, cancel],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
