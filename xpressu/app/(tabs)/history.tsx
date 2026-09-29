import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { OBJECTIVE_OPTIONS } from '@/constants/objectives';
import { colors, layout, radius, spacing, type } from '@/constants/theme';
import { relativeTime } from '@/lib/format';
import { entitlements } from '@/services/subscription';
import type { HistorySummary } from '@/types';

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function History() {
  const app = useApp();
  const toast = useToast();
  const canSave = entitlements.canSaveHistory(app.isPremium);

  const renderItem = ({ item }: { item: HistorySummary }) => {
    const objective = OBJECTIVE_OPTIONS.find((o) => o.id === item.objective);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}
        onLongPress={() => confirm('Delete this conversation?', 'It will be removed from this device.', () => void app.removeHistoryEntry(item.id))}
        accessibilityRole="button"
        accessibilityLabel={`${objective?.label ?? ''}: ${item.preview}`}
        accessibilityHint="Opens the saved replies. Long-press to delete."
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
        <View style={styles.itemIcon}>
          <Text style={styles.emoji}>{objective?.emoji ?? '💬'}</Text>
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemTop}>
            <Text style={styles.itemTitle}>{objective?.label ?? 'Conversation'}</Text>
            <Text style={styles.itemTime}>{relativeTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.itemPreview} numberOfLines={2}>
            {item.preview}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  };

  const header = (
    <View>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          History
        </Text>
        {app.history.length ? (
          <Pressable
            onPress={() =>
              confirm('Clear all history?', 'Every saved conversation and reply on this device will be deleted.', async () => {
                await app.clearAllHistory();
                toast.show('History cleared');
              })
            }
            accessibilityRole="button"
            hitSlop={8}>
            <Text style={styles.clear}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>
      {canSave && !app.preferences.saveHistory ? (
        <View style={styles.banner}>
          <Banner
            tone="info"
            icon="lock-closed"
            title="History is off"
            message="Conversations aren’t saved by default. Turn on history in Settings to keep them — encrypted, on this device only."
            action={<Button label="Turn on" size="sm" variant="secondary" onPress={() => app.updatePreferences({ saveHistory: true })} />}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={app.history}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          !canSave ? (
            <EmptyState
              icon="time"
              title="Keep your best replies"
              body="Premium saves your conversations and replies — encrypted, on this device only."
              action={<Button label="Unlock history" icon="diamond" onPress={() => router.push('/paywall')} />}
            />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No saved conversations"
              body={app.preferences.saveHistory ? 'Generate replies and they’ll show up here.' : 'History is turned off.'}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxxl, width: '100%', maxWidth: layout.maxContentWidth + layout.gutter * 2, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { ...type.title, fontSize: 34, lineHeight: 38, color: colors.text },
  clear: { color: colors.danger, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  banner: { marginBottom: spacing.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { opacity: 0.7 },
  itemIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.cardHigh, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemTitle: { ...type.bodyStrong, color: colors.text },
  itemTime: { ...type.caption, color: colors.textMuted },
  itemPreview: { ...type.small, color: colors.textSecondary },
  sep: { height: spacing.sm },
});
