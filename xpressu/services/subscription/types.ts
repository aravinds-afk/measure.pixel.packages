import type { PlanId, SubscriptionStatus } from '@/types';

/**
 * Provider-agnostic subscription interface. The app only talks to this, so
 * swapping the mock for RevenueCat is a one-line change in ./index.ts.
 */
export interface SubscriptionProvider {
  readonly name: string;
  /** True when purchases are simulated (shown in the UI). */
  readonly isMock: boolean;
  configure(userId: string | null): Promise<void>;
  getStatus(): Promise<SubscriptionStatus>;
  purchase(plan: PlanId): Promise<SubscriptionStatus>;
  restore(): Promise<SubscriptionStatus>;
  /** Dev/testing only. */
  reset?(): Promise<SubscriptionStatus>;
}

export const PREMIUM_ENTITLEMENT = 'premium';

export const FREE_STATUS: SubscriptionStatus = { isPremium: false, plan: null, expiresAt: null, source: 'none' };
