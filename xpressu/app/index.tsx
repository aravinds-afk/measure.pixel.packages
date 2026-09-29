import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/components/providers/AppProvider';
import { Logo } from '@/components/ui/Logo';
import { TAGLINE } from '@/constants/config';
import { colors, spacing, type } from '@/constants/theme';

const MIN_SPLASH_MS = 1100;

/** Animated splash. Waits for local state, then routes to onboarding or home. */
export default function Splash() {
  const { ready, preferences } = useApp();
  const [minElapsed, setMinElapsed] = useState(false);
  const logo = useState(() => new Animated.Value(0))[0];
  const tagline = useState(() => new Animated.Value(0))[0];
  const glow = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logo, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }),
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(tagline, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [logo, tagline, glow]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    router.replace(preferences.onboarded ? '/(tabs)' : '/onboarding');
  }, [ready, minElapsed, preferences.onboarded]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.glow,
          { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
        ]}
      />
      <Animated.View style={{ opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
        <Logo size={48} />
      </Animated.View>
      <Animated.Text
        style={[styles.tagline, { opacity: tagline, transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
        {TAGLINE}
      </Animated.Text>
      <Text style={styles.footer}>AI texting copilot</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: colors.accent, opacity: 0.5, filter: 'blur(90px)' },
  tagline: { ...type.bodyStrong, color: colors.textSecondary, marginTop: spacing.lg, fontSize: 17 },
  footer: { position: 'absolute', bottom: 48, ...type.label, color: colors.textMuted },
});
