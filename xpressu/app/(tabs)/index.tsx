import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ConversationInput } from '@/components/compose/ConversationInput';
import { ModeBadge } from '@/components/compose/ModeBadge';
import { ObjectiveSelector } from '@/components/compose/ObjectiveSelector';
import { UsagePill } from '@/components/compose/UsagePill';
import { useApp } from '@/components/providers/AppProvider';
import { useSession } from '@/components/providers/SessionProvider';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { LIMITS } from '@/constants/config';
import { OBJECTIVE_OPTIONS } from '@/constants/objectives';
import { colors, spacing, type } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { isMockAi } from '@/lib/env';

export default function Home() {
  const app = useApp();
  const session = useSession();
  const { isOnline } = useNetworkStatus();
  const { width } = useWindowDimensions();
  const compact = width < 360;

  const trimmed = session.draft.trim();
  const tooShort = trimmed.length < LIMITS.conversationMinChars;
  const needsNetwork = !isMockAi;
  const offline = needsNetwork && !isOnline;
  const outOfQuota = !app.canGenerate;
  const objectiveHint = OBJECTIVE_OPTIONS.find((o) => o.id === session.objective)?.hint;

  const onGenerate = () => {
    if (outOfQuota) {
      router.push('/paywall');
      return;
    }
    // Navigate immediately; the results screen shows the loading animation.
    void session.generate();
    router.push('/results');
  };

  return (
    <Screen
      footer={
        <Button
          label={outOfQuota ? 'Unlock unlimited replies' : 'Generate Replies'}
          icon={outOfQuota ? 'diamond' : 'sparkles'}
          onPress={onGenerate}
          disabled={(tooShort && !outOfQuota) || offline}
          accessibilityHint="Generates three reply options"
        />
      }>
      <View style={styles.topBar}>
        <Logo size={compact ? 20 : 24} />
        <View style={styles.topRight}>
          {compact ? null : <ModeBadge />}
          <UsagePill isPremium={app.isPremium} remaining={app.usage.remaining} limit={app.usage.limit} onPress={() => router.push('/paywall')} />
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        What are you{'\n'}replying to?
      </Text>

      {offline ? (
        <View style={styles.banner}>
          <Banner tone="warning" icon="cloud-offline" title="You’re offline" message="You can keep writing. Generating needs a connection." />
        </View>
      ) : null}

      <ConversationInput value={session.draft} onChange={session.setDraft} onClear={session.clearDraft} />

      <View style={styles.section}>
        <SectionLabel>What’s the goal?</SectionLabel>
        <ObjectiveSelector value={session.objective} onChange={session.setObjective} />
        {objectiveHint ? <Text style={styles.hint}>{objectiveHint}</Text> : null}
      </View>

      {outOfQuota ? (
        <View style={styles.section}>
          <Banner
            tone="accent"
            icon="flash"
            title="You’ve used today’s 5 free replies"
            message="Premium gets you unlimited replies, advanced tones and your personal texting style."
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  title: { ...type.title, fontSize: 32, lineHeight: 36, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xl },
  banner: { marginBottom: spacing.lg },
  section: { marginTop: spacing.xxl },
  hint: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
});
