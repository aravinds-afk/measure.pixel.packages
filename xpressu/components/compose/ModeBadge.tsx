import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { isMockAi } from '@/lib/env';

/** Visible marker that replies come from the on-device MOCK, not the real AI. */
export function ModeBadge() {
  if (!isMockAi) return null;
  return (
    <View style={styles.badge} accessibilityLabel="Demo mode: mock AI">
      <Text style={styles.text}>DEMO AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(251,191,36,0.1)',
  },
  text: { color: colors.warning, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
