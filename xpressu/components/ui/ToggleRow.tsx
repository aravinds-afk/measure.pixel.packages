import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  locked?: boolean;
  onLockedPress?: () => void;
  disabled?: boolean;
}

export function ToggleRow({ title, subtitle, value, onChange, locked, onLockedPress, disabled }: ToggleRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={locked ? onLockedPress : () => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: disabled || locked }}
      accessibilityLabel={title}>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {locked ? <Ionicons name="lock-closed" size={13} color={colors.textMuted} /> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value && !locked}
        onValueChange={locked ? () => onLockedPress?.() : onChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.accent }}
        thumbColor="#fff"
        ios_backgroundColor={colors.borderStrong}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...type.bodyStrong, color: colors.text },
  subtitle: { ...type.small, color: colors.textSecondary, marginTop: 2 },
});
