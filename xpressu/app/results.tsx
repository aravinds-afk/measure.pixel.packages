import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ModeBadge } from '@/components/compose/ModeBadge';
import { useApp } from '@/components/providers/AppProvider';
import { useSession } from '@/components/providers/SessionProvider';
import { GeneratingIndicator } from '@/components/reply/GeneratingIndicator';
import { ResultsView } from '@/components/reply/ResultsView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { objectiveLabel } from '@/constants/objectives';
import { colors, spacing, type } from '@/constants/theme';
import { entitlements } from '@/services/subscription';

export default function Results() {
  const app = useApp();
  const session = useSession();
  const { generation } = session;
  const loading = generation.status === 'loading';
  const error = generation.error;

  const startOver = () => {
    session.clearDraft();
    router.dismissTo('/(tabs)');
  };

  const footer =
    generation.status === 'success' ? (
      <View style={styles.footerRow}>
        <Button label="New chat" icon="add" variant="secondary" size="md" onPress={startOver} style={styles.flex} />
        <Button label="Regenerate all" icon="refresh" size="md" onPress={session.regenerateAll} style={styles.flex} />
      </View>
    ) : undefined;

  return (
    <Screen edges={['top', 'bottom']} footer={footer}>
      <ScreenHeader
        title="Your replies"
        right={
          <>
            <ModeBadge />
          </>
        }
      />
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {objectiveLabel(generation.objective)} · {generation.tone.charAt(0).toUpperCase() + generation.tone.slice(1)} tone
        </Text>
      </View>

      {loading ? (
        <>
          <GeneratingIndicator />
          <View style={styles.cancel}>
            <Button label="Cancel" variant="ghost" size="sm" onPress={session.cancel} />
          </View>
        </>
      ) : generation.status === 'error' && error ? (
        <EmptyState
          icon={error.code === 'quota_exceeded' ? 'flash' : error.code === 'offline' ? 'cloud-offline' : 'alert-circle'}
          title={error.title}
          body={error.message}
          action={
            error.code === 'quota_exceeded' ? (
              <Button label="Go Premium" icon="diamond" onPress={() => router.push('/paywall')} />
            ) : (
              <View style={styles.errorActions}>
                {error.retryable ? <Button label="Try again" icon="refresh" onPress={() => void session.generate()} /> : null}
                <Button label="Edit conversation" variant="secondary" onPress={() => router.back()} />
              </View>
            )
          }
        />
      ) : generation.response ? (
        <>
          {error ? (
            <View style={styles.inlineError}>
              <Banner
                tone={error.code === 'quota_exceeded' ? 'accent' : 'danger'}
                title={error.title}
                message={error.message}
                action={error.code === 'quota_exceeded' ? <Button label="Go Premium" size="sm" onPress={() => router.push('/paywall')} /> : undefined}
              />
            </View>
          ) : null}
          <ResultsView
            response={generation.response}
            edits={generation.edits}
            regenerating={generation.regenerating}
            onRegenerateOne={session.regenerateOne}
            onEdit={session.editReply}
            onResetEdit={session.resetEdit}
            analysisLocked={!entitlements.advancedAnalysis(app.isPremium)}
            onUnlockAnalysis={() => router.push('/paywall')}
          />
        </>
      ) : (
        <EmptyState
          icon="chatbubbles"
          title="Nothing here yet"
          body="Paste a conversation on the Reply tab to get suggestions."
          action={<Button label="Start" onPress={() => router.dismissTo('/(tabs)')} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginBottom: spacing.xl },
  metaText: { ...type.small, color: colors.textSecondary },
  cancel: { alignItems: 'center', marginTop: spacing.lg },
  errorActions: { gap: spacing.md },
  inlineError: { marginBottom: spacing.lg },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
