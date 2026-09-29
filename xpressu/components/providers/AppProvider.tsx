/**
 * App-wide state: preferences, texting-style profile, subscription, daily
 * usage, and (opt-in) history. Everything is persisted in encrypted storage.
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { setHapticsEnabled } from '@/lib/haptics';
import { ensureSession } from '@/services/auth/authService';
import * as historyStore from '@/services/storage/historyStore';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_USER_STYLE,
  loadPreferences,
  loadUserStyle,
  savePreferences,
  saveUserStyle,
} from '@/services/storage/preferencesStore';
import * as usageStore from '@/services/storage/usageStore';
import { entitlements, subscriptionProvider } from '@/services/subscription';
import { FREE_STATUS } from '@/services/subscription/types';
import type { HistorySummary, PlanId, Preferences, SubscriptionStatus, UserStyle } from '@/types';

interface AppContextValue {
  ready: boolean;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  userStyle: UserStyle;
  updateUserStyle: (style: UserStyle) => Promise<void>;
  subscription: SubscriptionStatus;
  isPremium: boolean;
  purchase: (plan: PlanId) => Promise<SubscriptionStatus>;
  restorePurchases: () => Promise<SubscriptionStatus>;
  resetSubscription: () => Promise<void>;
  usage: usageStore.UsageState;
  canGenerate: boolean;
  recordGeneration: () => Promise<void>;
  markQuotaExhausted: () => Promise<void>;
  history: HistorySummary[];
  /** Whether new generations will be saved to history right now. */
  historyEnabled: boolean;
  refreshHistory: () => Promise<void>;
  removeHistoryEntry: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const preferencesRef = useRef<Preferences>(DEFAULT_PREFERENCES);
  const setPreferences = useCallback((prefs: Preferences) => {
    preferencesRef.current = prefs;
    setPreferencesState(prefs);
  }, []);
  const [userStyle, setUserStyle] = useState<UserStyle>(DEFAULT_USER_STYLE);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(FREE_STATUS);
  const [usage, setUsage] = useState<usageStore.UsageState>({ used: 0, limit: 5, remaining: 5 });
  const [history, setHistory] = useState<HistorySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prefs, style, use, hist] = await Promise.all([
          loadPreferences(),
          loadUserStyle(),
          usageStore.getUsage(),
          historyStore.listHistory(),
        ]);
        if (cancelled) return;
        setPreferences(prefs);
        setHapticsEnabled(prefs.haptics);
        setUserStyle(style);
        setUsage(use);
        setHistory(hist);

        // Auth + subscription are best-effort; the app works offline without them.
        const auth = await ensureSession().catch(() => null);
        await subscriptionProvider.configure(auth?.userId ?? null).catch(() => {});
        const status = await subscriptionProvider.getStatus().catch(() => FREE_STATUS);
        if (!cancelled) setSubscription(status);
      } catch (err) {
        console.warn('[app] failed to load local state', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPreferences]);

  const isPremium = subscription.isPremium;

  const updatePreferences = useCallback(async (patch: Partial<Preferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    setPreferences(next);
    if (patch.haptics !== undefined) setHapticsEnabled(patch.haptics);
    await savePreferences(next);
  }, [setPreferences]);

  const updateUserStyle = useCallback(async (style: UserStyle) => {
    setUserStyle(style);
    await saveUserStyle(style);
  }, []);

  const purchase = useCallback(async (plan: PlanId) => {
    const status = await subscriptionProvider.purchase(plan);
    setSubscription(status);
    return status;
  }, []);

  const restorePurchases = useCallback(async () => {
    const status = await subscriptionProvider.restore();
    setSubscription(status);
    return status;
  }, []);

  const resetSubscription = useCallback(async () => {
    if (!subscriptionProvider.reset) return;
    setSubscription(await subscriptionProvider.reset());
  }, []);

  const recordGeneration = useCallback(async () => {
    setUsage(await usageStore.recordGeneration());
  }, []);

  const markQuotaExhausted = useCallback(async () => {
    setUsage(await usageStore.markExhausted());
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistory(await historyStore.listHistory());
  }, []);

  const removeHistoryEntry = useCallback(async (id: string) => {
    setHistory(await historyStore.deleteHistoryEntry(id));
  }, []);

  const clearAllHistory = useCallback(async () => {
    await historyStore.clearHistory();
    setHistory([]);
  }, []);

  const clearAllData = useCallback(async () => {
    await historyStore.clearHistory();
    await saveUserStyle(DEFAULT_USER_STYLE);
    const prefs = { ...DEFAULT_PREFERENCES, onboarded: true };
    await savePreferences(prefs);
    setHistory([]);
    setUserStyle(DEFAULT_USER_STYLE);
    setPreferences(prefs);
  }, [setPreferences]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      preferences,
      updatePreferences,
      userStyle,
      updateUserStyle,
      subscription,
      isPremium,
      purchase,
      restorePurchases,
      resetSubscription,
      usage,
      canGenerate: entitlements.unlimitedGenerations(isPremium) || usage.remaining > 0,
      recordGeneration,
      markQuotaExhausted,
      history,
      historyEnabled: preferences.saveHistory && entitlements.canSaveHistory(isPremium),
      refreshHistory,
      removeHistoryEntry,
      clearAllHistory,
      clearAllData,
    }),
    [
      ready,
      preferences,
      updatePreferences,
      userStyle,
      updateUserStyle,
      subscription,
      isPremium,
      purchase,
      restorePurchases,
      resetSubscription,
      usage,
      recordGeneration,
      markQuotaExhausted,
      history,
      refreshHistory,
      removeHistoryEntry,
      clearAllHistory,
      clearAllData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
