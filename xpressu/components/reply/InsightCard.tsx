import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';

interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  caption?: string;
}

export function InsightCard({ icon, title, body, caption }: InsightCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={16} color={colors.accent} />
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...type.bodyStrong, color: colors.text },
  caption: { ...type.label, fontSize: 10, color: colors.textMuted, marginLeft: 'auto' },
  body: { ...type.body, color: colors.textSecondary },
});
