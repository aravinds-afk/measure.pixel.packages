/**
 * RevenueCat provider — integration scaffold.
 *
 * To enable:
 *   1. npx expo install react-native-purchases
 *   2. Create products `premium_monthly` / `premium_yearly` in App Store Connect
 *      and Google Play, attach them to an entitlement named "premium" and an
 *      offering in RevenueCat.
 *   3. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.
 *   4. Uncomment the implementation below and switch the export in ./index.ts.
 *   5. Point the RevenueCat webhook at the `revenuecat-webhook` Supabase function
 *      so the server-side quota honors premium.
 *   6. Build a development client (RevenueCat is not in Expo Go):
 *      npx expo run:ios / npx expo run:android or `eas build --profile development`.
 *
 * Use the Supabase user id as the RevenueCat app user id so the webhook can
 * map purchases to `profiles.id`.
 */
import type { SubscriptionProvider } from './types';
import { FREE_STATUS } from './types';

/*
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { env } from '@/lib/env';
import { PREMIUM_ENTITLEMENT } from './types';
import type { PlanId, SubscriptionStatus } from '@/types';

function toStatus(info: CustomerInfo): SubscriptionStatus {
  const ent = info.entitlements.active[PREMIUM_ENTITLEMENT];
  return {
    isPremium: Boolean(ent),
    plan: (ent?.productIdentifier as PlanId | undefined) ?? null,
    expiresAt: ent?.expirationDate ? Date.parse(ent.expirationDate) : null,
    source: 'revenuecat',
  };
}

export const revenueCatProvider: SubscriptionProvider = {
  name: 'revenuecat',
  isMock: false,
  async configure(userId) {
    const apiKey = Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey;
    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  },
  async getStatus() {
    return toStatus(await Purchases.getCustomerInfo());
  },
  async purchase(plan) {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find((p) => p.product.identifier === plan);
    if (!pkg) throw new Error(`Package ${plan} not found`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return toStatus(customerInfo);
  },
  async restore() {
    return toStatus(await Purchases.restorePurchases());
  },
};
*/

/** Placeholder so the module has a valid export until RevenueCat is enabled. */
export const revenueCatProviderPlaceholder: SubscriptionProvider = {
  name: 'revenuecat',
  isMock: false,
  async configure() {},
  async getStatus() {
    return { ...FREE_STATUS, source: 'revenuecat' };
  },
  async purchase() {
    throw new Error('RevenueCat is not configured yet. See services/subscription/revenueCatProvider.ts');
  },
  async restore() {
    return { ...FREE_STATUS, source: 'revenuecat' };
  },
};
