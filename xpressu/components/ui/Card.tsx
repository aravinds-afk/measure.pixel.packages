import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export function Card({ children, style, highlight }: { children: ReactNode; style?: ViewStyle; highlight?: boolean }) {
  return <View style={[styles.card, highlight && styles.highlight, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  highlight: { borderColor: colors.accentBorder },
});
