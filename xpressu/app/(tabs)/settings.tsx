import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { OBJECTIVE_OPTIONS } from '@/constants/objectives';
import { TONE_OPTIONS } from '@/constants/tones';
import { colors, radius, spacing, type } from '@/constants/theme';
import { env, isSupabaseConfigured } from '@/lib/env';
import { hasStyleProfile } from '@/services/storage/preferencesStore';
import { resetUsage } from '@/services/storage/usageStore';
import { entitlements, subscriptionProvider } from '@/services/subscription';

function confirmDestructive(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function Settings() {
  const app = useApp();
  const toast = useToast();
  const { preferences: prefs, isPremium } = app;
  const openPaywall = () => router.push('/paywall');
  const styleSet = hasStyleProfile(app.userStyle);

  const restore = async () => {
    const status = await app.restorePurchases().catch(() => null);
    toast.show(status?.isPremium ? 'Premium restored' : 'No purchases found', status?.isPremium ? 'success' : 'info');
  };

  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">
        Settings
      </Text>

      {/* Subscription */}
      <Pressable onPress={openPaywall} accessibilityRole="button" accessibilityLabel={isPremium ? 'Manage Premium' : 'Upgrade to Premium'}>
        <Card highlight style={styles.planCard}>
          <View style={styles.planIcon}>
            <Ionicons name="diamond" size={22} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.planTitle}>{isPremium ? 'XpressU Premium' : 'Free plan'}</Text>
            <Text style={styles.planBody}>
              {isPremium
                ? `Unlimited replies${app.subscription.expiresAt ? ` · renews ${new Date(app.subscription.expiresAt).toLocaleDateString()}` : ''}`
                : `${app.usage.remaining} of ${app.usage.limit} free replies left today`}
            </Text>
          </View>
          {!isPremium ? (
            <View style={styles.upgrade}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </Card>
      </Pressable>

      {/* AI preferences */}
      <View style={styles.section}>
        <SectionLabel>Tone preference</SectionLabel>
        <View style={styles.chips}>
          {TONE_OPTIONS.map((t) => {
            const locked = !entitlements.canUseTone(t.id, isPremium);
            return (
              <Chip
                key={t.id}
                label={t.label}
                selected={prefs.tone === t.id}
                locked={locked}
                onPress={() => (locked ? openPaywall() : void app.updatePreferences({ tone: t.id }))}
              />
            );
          })}
        </View>
        <Text style={styles.caption}>{TONE_OPTIONS.find((t) => t.id === prefs.tone)?.description}</Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>AI preferences</SectionLabel>
        <Card style={styles.group}>
          <ListRow
            icon="person-circle-outline"
            title="How I normally text"
            subtitle={styleSet ? 'Your style profile is set' : 'Teach XpressU your texting style'}
            badge={entitlements.canUseStyleProfile(isPremium) ? undefined : 'PRO'}
            onPress={() => router.push('/style-profile')}
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Use my texting style"
            subtitle="Adapt replies to how you write"
            value={prefs.useStyleProfile}
            locked={!entitlements.canUseStyleProfile(isPremium)}
            onLockedPress={openPaywall}
            onChange={(v) => app.updatePreferences({ useStyleProfile: v })}
          />
          <View style={styles.divider} />
          <Text style={styles.rowLabel}>Default goal</Text>
          <View style={[styles.chips, styles.chipsInCard]}>
            {OBJECTIVE_OPTIONS.map((o) => (
              <Chip
                key={o.id}
                label={o.label}
                emoji={o.emoji}
                selected={prefs.defaultObjective === o.id}
                onPress={() => app.updatePreferences({ defaultObjective: o.id })}
              />
            ))}
          </View>
        </Card>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <SectionLabel>Privacy</SectionLabel>
        <Card style={styles.group}>
          <ToggleRow
            title="Save conversation history"
            subtitle="Off by default. Encrypted, on this device only."
            value={prefs.saveHistory}
            locked={!entitlements.canSaveHistory(isPremium)}
            onLockedPress={openPaywall}
            onChange={(v) => app.updatePreferences({ saveHistory: v })}
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Hide contact details"
            subtitle="Remove emails, phone numbers and links before sending to the AI"
            value={prefs.redactContactInfo}
            onChange={(v) => app.updatePreferences({ redactContactInfo: v })}
          />
          <View style={styles.divider} />
          <ListRow icon="shield-checkmark-outline" title="How your data is handled" onPress={() => router.push('/privacy')} />
          <View style={styles.divider} />
          <ListRow
            icon="trash-outline"
            title="Clear history"
            subtitle={`${app.history.length} saved conversation${app.history.length === 1 ? '' : 's'}`}
            destructive
            onPress={() =>
              confirmDestructive('Clear all history?', 'Every saved conversation on this device will be deleted.', 'Clear', async () => {
                await app.clearAllHistory();
                toast.show('History cleared');
              })
            }
          />
          <View style={styles.divider} />
          <ListRow
            icon="nuclear-outline"
            title="Delete all my data"
            subtitle="History, style profile and preferences"
            destructive
            onPress={() =>
              confirmDestructive('Delete all data?', 'This removes your history, texting style and preferences from this device.', 'Delete', async () => {
                await app.clearAllData();
                toast.show('All local data deleted');
              })
            }
          />
        </Card>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <SectionLabel>Subscription</SectionLabel>
        <Card style={styles.group}>
          <ListRow icon="diamond-outline" title={isPremium ? 'Manage Premium' : 'See Premium plans'} onPress={openPaywall} />
          <View style={styles.divider} />
          <ListRow icon="refresh-outline" title="Restore purchases" onPress={restore} />
          {subscriptionProvider.isMock ? (
            <>
              <View style={styles.divider} />
              <ListRow
                icon="construct-outline"
                title="Reset test subscription"
                subtitle="Mock billing is active — no real payments"
                onPress={async () => {
                  await app.resetSubscription();
                  await resetUsage();
                  toast.show('Test subscription and usage reset', 'info');
                }}
              />
            </>
          ) : null}
        </Card>
      </View>

      {/* App */}
      <View style={styles.section}>
        <SectionLabel>App</SectionLabel>
        <Card style={styles.group}>
          <ToggleRow title="Haptics" value={prefs.haptics} onChange={(v) => app.updatePreferences({ haptics: v })} />
        </Card>
      </View>

      <Text style={styles.footer}>
        XpressU {Constants.expoConfig?.version ?? ''} · AI: {env.aiMode === 'mock' ? 'Demo (mock)' : 'Live'} · Auth: {isSupabaseConfigured ? 'on' : 'off'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 34, lineHeight: 38, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.xl },
  flex: { flex: 1 },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  planIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  planTitle: { ...type.bodyStrong, color: colors.text, fontSize: 17 },
  planBody: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  upgrade: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  upgradeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  section: { marginTop: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipsInCard: { paddingBottom: spacing.md },
  caption: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
  group: { paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  rowLabel: { ...type.bodyStrong, color: colors.text, paddingTop: spacing.md, paddingBottom: spacing.md },
  footer: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
