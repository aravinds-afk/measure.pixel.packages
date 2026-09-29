/**
 * ⚠️ MOCK SUBSCRIPTION PROVIDER — no real payments.
 * Simulates purchases by storing a local flag so the full premium UX can be
 * tested. Replace with RevenueCat (see ./revenueCatProvider.ts) before release.
 */
import type { PlanId, SubscriptionStatus } from '@/types';
import { getJSON, removeItem, setJSON } from '@/services/storage/secureStorage';

import { FREE_STATUS, type SubscriptionProvider } from './types';

const KEY = 'subscription.mock.v1';
const DAY = 24 * 60 * 60 * 1000;

export const mockSubscriptionProvider: SubscriptionProvider = {
  name: 'mock',
  isMock: true,
  async configure() {},
  async getStatus() {
    const stored = await getJSON<SubscriptionStatus>(KEY);
    if (!stored) return { ...FREE_STATUS, source: 'mock' };
    if (stored.expiresAt && stored.expiresAt < Date.now()) return { ...FREE_STATUS, source: 'mock' };
    return stored;
  },
  async purchase(plan: PlanId) {
    await new Promise((r) => setTimeout(r, 700));
    const status: SubscriptionStatus = {
      isPremium: true,
      plan,
      expiresAt: Date.now() + (plan === 'premium_yearly' ? 365 : 30) * DAY,
      source: 'mock',
    };
    await setJSON(KEY, status);
    return status;
  },
  async restore() {
    return this.getStatus();
  },
  async reset() {
    await removeItem(KEY);
    return { ...FREE_STATUS, source: 'mock' };
  },
};
