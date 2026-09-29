import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';
import type { Analysis } from '@/types';

const LEVEL_COLOR: Record<string, string> = {
  low: colors.danger,
  stalling: colors.danger,
  medium: colors.warning,
  steady: colors.warning,
  unclear: colors.textSecondary,
  high: colors.success,
  building: colors.success,
};

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meter}>
      <Text style={styles.meterLabel}>{label}</Text>
      <View style={styles.meterValueRow}>
        <View style={[styles.meterDot, { backgroundColor: LEVEL_COLOR[value] ?? colors.textSecondary }]} />
        <Text style={styles.meterValue}>{value.charAt(0).toUpperCase() + value.slice(1)}</Text>
      </View>
    </View>
  );
}

interface AnalysisPanelProps {
  analysis: Analysis | null | undefined;
  locked: boolean;
  onUnlock: () => void;
}

export function AnalysisPanel({ analysis, locked, onUnlock }: AnalysisPanelProps) {
  if (locked) {
    return (
      <Pressable onPress={onUnlock} style={[styles.card, styles.locked]} accessibilityRole="button" accessibilityLabel="Unlock advanced analysis with Premium">
        <Ionicons name="analytics" size={20} color={colors.accent} />
        <View style={styles.lockedText}>
          <Text style={styles.title}>Advanced analysis</Text>
          <Text style={styles.body}>See engagement, momentum, unanswered questions and openings.</Text>
        </View>
        <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
      </Pressable>
    );
  }
  if (!analysis) return null;
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="analytics" size={16} color={colors.accent} />
        <Text style={styles.title}>Conversation analysis</Text>
      </View>
      <View style={styles.meters}>
        <Meter label="ENGAGEMENT" value={analysis.engagement} />
        <Meter label="MOMENTUM" value={analysis.momentum} />
      </View>
      <Text style={styles.body}>
        <Text style={styles.strong}>Tone: </Text>
        {analysis.tone}
      </Text>
      {analysis.summary ? <Text style={[styles.body, styles.gap]}>{analysis.summary}</Text> : null}
      {analysis.questionsToAnswer.length ? (
        <View style={styles.gap}>
          <Text style={styles.subhead}>Needs an answer</Text>
          {analysis.questionsToAnswer.map((q) => (
            <Text key={q} style={styles.bullet}>• {q}</Text>
          ))}
        </View>
      ) : null}
      {analysis.openings.length ? (
        <View style={styles.gap}>
          <Text style={styles.subhead}>Openings</Text>
          {analysis.openings.map((o) => (
            <Text key={o} style={styles.bullet}>• {o}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  locked: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: colors.accentBorder, borderStyle: 'dashed', borderWidth: 1 },
  lockedText: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...type.bodyStrong, color: colors.text },
  meters: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  meter: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
  meterLabel: { ...type.label, fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  meterValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterDot: { width: 8, height: 8, borderRadius: 4 },
  meterValue: { ...type.bodyStrong, color: colors.text },
  body: { ...type.small, color: colors.textSecondary },
  strong: { color: colors.text, fontWeight: '700' },
  gap: { marginTop: spacing.sm },
  subhead: { ...type.small, color: colors.text, fontWeight: '700', marginBottom: 2 },
  bullet: { ...type.small, color: colors.textSecondary },
});
