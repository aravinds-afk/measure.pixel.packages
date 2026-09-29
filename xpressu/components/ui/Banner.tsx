import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';

type Tone = 'info' | 'warning' | 'danger' | 'accent';

const TONES: Record<Tone, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
  info: { icon: 'information-circle', color: colors.textSecondary, bg: colors.card, border: colors.border },
  warning: { icon: 'warning', color: colors.warning, bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)' },
  danger: { icon: 'alert-circle', color: colors.danger, bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)' },
  accent: { icon: 'sparkles', color: colors.accent, bg: colors.accentSoft, border: colors.accentBorder },
};

interface BannerProps {
  tone?: Tone;
  title?: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
}

export function Banner({ tone = 'info', title, message, icon, action }: BannerProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.root, { backgroundColor: t.bg, borderColor: t.border }]} accessibilityRole="alert">
      <Ionicons name={icon ?? t.icon} size={18} color={t.color} style={styles.icon} />
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: tone === 'info' ? colors.text : t.color }]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  icon: { marginTop: 2 },
  body: { flex: 1 },
  title: { ...type.bodyStrong, marginBottom: 2 },
  message: { ...type.small, color: colors.textSecondary },
  action: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
