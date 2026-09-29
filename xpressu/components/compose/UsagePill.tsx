import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/constants/theme';

interface UsagePillProps {
  isPremium: boolean;
  remaining: number;
  limit: number;
  onPress: () => void;
}

export function UsagePill({ isPremium, remaining, limit, onPress }: UsagePillProps) {
  const empty = !isPremium && remaining === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isPremium ? 'Premium: unlimited replies' : `${remaining} of ${limit} free replies left today`}
      style={[styles.pill, isPremium && styles.premium, empty && styles.empty]}>
      <Ionicons name={isPremium ? 'diamond' : 'flash'} size={13} color={isPremium || empty ? colors.accent : colors.text} />
      <Text style={[styles.text, (isPremium || empty) && { color: colors.accent }]}>
        {isPremium ? 'Premium' : `${remaining}/${limit} left`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  premium: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  empty: { borderColor: colors.accentBorder },
  text: { color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
