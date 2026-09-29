import { mockSubscriptionProvider } from './mockProvider';
import type { SubscriptionProvider } from './types';

/**
 * Active subscription provider. Swap to `revenueCatProvider` once it's
 * configured (see ./revenueCatProvider.ts).
 */
export const subscriptionProvider: SubscriptionProvider = mockSubscriptionProvider;

export * from './entitlements';
export type { SubscriptionProvider } from './types';
