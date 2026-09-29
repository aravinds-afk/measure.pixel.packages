import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { PLANS, PREMIUM_FEATURES, TERMS_URL } from '@/constants/config';
import { colors, radius, spacing, type } from '@/constants/theme';
import { subscriptionProvider } from '@/services/subscription';
import type { PlanId } from '@/types';

export default function Paywall() {
  const app = useApp();
  const toast = useToast();
  const [plan, setPlan] = useState<PlanId>('premium_yearly');
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      await app.purchase(plan);
      toast.show('Welcome to Premium');
      router.back();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Purchase failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    const status = await app.restorePurchases().catch(() => null);
    setBusy(false);
    toast.show(status?.isPremium ? 'Premium restored' : 'No purchases found', status?.isPremium ? 'success' : 'info');
    if (status?.isPremium) router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        app.isPremium ? (
          <Button label="You’re on Premium" icon="checkmark" variant="secondary" onPress={() => router.back()} />
        ) : (
          <View style={styles.footer}>
            <Button label="Continue" icon="diamond" onPress={buy} loading={busy} />
            <View style={styles.links}>
              <Pressable onPress={restore} accessibilityRole="button">
                <Text style={styles.link}>Restore</Text>
              </Pressable>
              <Text style={styles.dot}>·</Text>
              <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
                <Text style={styles.link}>Terms</Text>
              </Pressable>
              <Text style={styles.dot}>·</Text>
              <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
                <Text style={styles.link}>Privacy</Text>
              </Pressable>
            </View>
          </View>
        )
      }>
      <ScreenHeader close back={false} />
      <LinearGradient colors={[colors.accentSoft, 'transparent']} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="diamond" size={30} color={colors.accent} />
        </View>
        <Text style={styles.title}>XpressU Premium</Text>
        <Text style={styles.subtitle}>Never run out of the right thing to say.</Text>
      </LinearGradient>

      <View style={styles.features}>
        {PREMIUM_FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
            <View style={styles.flex}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {!app.isPremium ? (
        <View style={styles.plans}>
          {PLANS.map((p) => {
            const selected = plan === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlan(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.plan, selected && styles.planSelected]}>
                <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                <View style={styles.flex}>
                  <Text style={styles.planTitle}>{p.title}</Text>
                  <Text style={styles.planNote}>{p.note}</Text>
                </View>
                <Text style={styles.planPrice}>{p.price}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {subscriptionProvider.isMock ? (
        <Text style={styles.mock}>TEST MODE — purchases are simulated. No payment is taken.</Text>
      ) : (
        <Text style={styles.legal}>Subscriptions renew automatically until cancelled in your store account settings.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: spacing.xxl, borderRadius: radius.xl, marginTop: spacing.sm },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  features: { gap: spacing.lg, marginTop: spacing.lg },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  featureTitle: { ...type.bodyStrong, color: colors.text },
  featureBody: { ...type.small, color: colors.textSecondary },
  plans: { gap: spacing.md, marginTop: spacing.xxl },
  plan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  planSelected: { borderColor: colors.accent, backgroundColor: '#1A1519' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  planTitle: { ...type.bodyStrong, color: colors.text },
  planNote: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  planPrice: { ...type.bodyStrong, color: colors.text },
  mock: { ...type.caption, color: colors.warning, textAlign: 'center', marginTop: spacing.xl },
  legal: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  footer: { gap: spacing.md },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  link: { ...type.caption, color: colors.textSecondary, textDecorationLine: 'underline' },
  dot: { ...type.caption, color: colors.textMuted },
});
