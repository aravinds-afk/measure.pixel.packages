import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';

const STEPS = ['Reading the vibe…', 'Checking momentum…', 'Finding openings…', 'Writing your replies…'];

function Dot({ delay }: { delay: number }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(480 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        styles.dot,
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] },
      ]}
    />
  );
}

function SkeletonCard({ index }: { index: number }) {
  const pulse = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, delay: index * 120, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, index]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });
  return (
    <View style={styles.card}>
      <Animated.View style={[styles.lineShort, { opacity }]} />
      <Animated.View style={[styles.line, { opacity }]} />
      <Animated.View style={[styles.line, styles.lineMid, { opacity }]} />
    </View>
  );
}

export function GeneratingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel="Generating replies">
      <View style={styles.status}>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={120} />
          <Dot delay={240} />
        </View>
        <Text style={styles.statusText}>{STEPS[step]}</Text>
      </View>
      <View style={styles.cards}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  dots: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  statusText: { ...type.bodyStrong, color: colors.textSecondary },
  cards: { gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  lineShort: { width: 90, height: 10, borderRadius: 5, backgroundColor: colors.cardHigh },
  line: { width: '100%', height: 16, borderRadius: 8, backgroundColor: colors.cardHigh },
  lineMid: { width: '70%' },
});
