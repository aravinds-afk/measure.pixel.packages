import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showLabel?: boolean;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export function IconButton({ icon, label, onPress, showLabel = true, active, loading, disabled }: IconButtonProps) {
  const color = active ? colors.accent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        active && styles.active,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}>
      {loading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Ionicons name={icon} size={16} color={color} />}
      {showLabel ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.cardHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  active: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 13, fontWeight: '700' },
});
