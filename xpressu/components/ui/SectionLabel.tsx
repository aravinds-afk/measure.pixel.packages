import { StyleSheet, Text, type TextStyle } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

export function SectionLabel({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: { ...type.label, color: colors.textMuted, marginBottom: spacing.md },
});
