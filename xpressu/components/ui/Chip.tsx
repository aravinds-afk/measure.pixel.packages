import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  emoji?: string;
  locked?: boolean;
}

export function Chip({ label, selected, onPress, emoji, locked }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={locked ? `${label} (Premium)` : label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {locked ? <Ionicons name="lock-closed" size={12} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pressed: { opacity: 0.75 },
  emoji: { fontSize: 15 },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  labelSelected: { color: colors.text },
});
