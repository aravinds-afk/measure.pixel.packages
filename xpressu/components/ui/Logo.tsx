import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Wordmark: "Xpress" in white + accent "U" inside a pill. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="XpressU">
      <Text style={[styles.word, { fontSize: size, lineHeight: size * 1.1 }]}>Xpress</Text>
      <View style={[styles.badge, { height: size * 1.05, minWidth: size * 0.95, borderRadius: size * 0.32, marginLeft: size * 0.08 }]}>
        <Text style={[styles.u, { fontSize: size * 0.78, lineHeight: size * 0.95 }]}>U</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { color: colors.text, fontWeight: '900', letterSpacing: -1.5 },
  badge: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  u: { color: '#fff', fontWeight: '900' },
});
