import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/components/providers/AppProvider';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { ResultsView } from '@/components/reply/ResultsView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { objectiveLabel } from '@/constants/objectives';
import { colors, radius, spacing, type } from '@/constants/theme';
import { relativeTime } from '@/lib/format';
import { getHistoryEntry } from '@/services/storage/historyStore';
import { entitlements } from '@/services/subscription';
import type { HistoryEntry, ReplyStyle } from '@/types';

export default function HistoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const session = useSession();
  const toast = useToast();
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);
  const [edits, setEdits] = useState<Partial<Record<ReplyStyle, string>>>({});

  useEffect(() => {
    if (!id) return;
    getHistoryEntry(id).then(setEntry).catch(() => setEntry(null));
  }, [id]);

  const reopen = () => {
    if (!entry) return;
    session.setDraft(entry.conversation);
    session.setObjective(entry.objective);
    session.loadFromHistory(entry);
    router.push('/results');
  };

  const remove = async () => {
    if (!entry) return;
    await app.removeHistoryEntry(entry.id);
    toast.show('Deleted');
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={entry ? objectiveLabel(entry.objective) : 'Conversation'}
        right={entry ? <IconButton icon="trash-outline" label="Delete" showLabel={false} onPress={remove} /> : null}
      />
      {entry === undefined ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : entry === null ? (
        <EmptyState icon="alert-circle" title="Not found" body="This conversation was deleted or couldn’t be read." />
      ) : (
        <View style={styles.body}>
          <Text style={styles.meta}>{relativeTime(entry.createdAt)}</Text>
          <View>
            <SectionLabel>Conversation (as sent)</SectionLabel>
            <View style={styles.convo}>
              <Text style={styles.convoText} selectable>
                {entry.conversation}
              </Text>
            </View>
          </View>
          <SectionLabel style={styles.repliesLabel}>Replies</SectionLabel>
          <ResultsView
            response={entry.result}
            edits={edits}
            regenerating={[]}
            onEdit={(style, text) => setEdits((e) => ({ ...e, [style]: text }))}
            onResetEdit={(style) =>
              setEdits((e) => {
                const next = { ...e };
                delete next[style];
                return next;
              })
            }
            analysisLocked={!entitlements.advancedAnalysis(app.isPremium)}
            onUnlockAnalysis={() => router.push('/paywall')}
          />
          <Button label="Continue this conversation" icon="refresh" variant="secondary" onPress={reopen} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xxxl },
  body: { gap: spacing.lg },
  meta: { ...type.small, color: colors.textSecondary },
  convo: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.lg, maxHeight: 220, overflow: 'hidden' },
  convoText: { ...type.small, color: colors.textSecondary },
  repliesLabel: { marginBottom: 0, marginTop: spacing.sm },
});
