import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

interface ListRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  badge?: string;
}

export function ListRow({ icon, title, subtitle, value, onPress, destructive, badge }: ListRowProps) {
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, destructive && styles.iconDanger]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.text} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {!destructive ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.cardHigh, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: 'rgba(248,113,113,0.1)' },
  text: { flex: 1 },
  title: { ...type.bodyStrong },
  subtitle: { ...type.small, color: colors.textSecondary, marginTop: 1 },
  value: { ...type.small, color: colors.textSecondary },
  badge: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
