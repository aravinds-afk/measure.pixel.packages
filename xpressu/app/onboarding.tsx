import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/components/providers/AppProvider';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing, type } from '@/constants/theme';

const STEPS = [
  { n: '1', icon: 'clipboard' as const, title: 'Paste the conversation.', body: 'From Hinge, Tinder, Bumble, Instagram, Snapchat, WhatsApp — anywhere.' },
  { n: '2', icon: 'flag' as const, title: 'Tell us what you’re trying to do.', body: 'Keep it going, flirt, ask them out, revive a dry chat…' },
  { n: '3', icon: 'sparkles' as const, title: 'Copy the perfect reply.', body: 'Three options — confident, playful, direct — with why they work.' },
];

export default function Onboarding() {
  const { updatePreferences } = useApp();
  const anims = useState(() => STEPS.map(() => new Animated.Value(0)))[0];

  useEffect(() => {
    Animated.stagger(
      120,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 420, useNativeDriver: true })),
    ).start();
  }, [anims]);

  const finish = async () => {
    await updatePreferences({ onboarded: true });
    router.replace('/(tabs)');
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          <Button label="Get started" icon="arrow-forward" onPress={finish} />
          <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
            <Text style={styles.privacy}>
              <Ionicons name="lock-closed" size={12} color={colors.textMuted} /> Conversations aren’t stored unless you choose to.{' '}
              <Text style={styles.link}>Privacy</Text>
            </Text>
          </Pressable>
        </View>
      }>
      <View style={styles.header}>
        <Logo size={34} />
        <Text style={styles.title}>Your texting copilot.</Text>
        <Text style={styles.subtitle}>Natural replies that sound like you — in under 30 seconds.</Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <Animated.View
            key={s.n}
            style={[
              styles.step,
              { opacity: anims[i], transform: [{ translateY: anims[i]!.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}>
            <View style={styles.stepIcon}>
              <Ionicons name={s.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepBody}>{s.body}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxxl, marginBottom: spacing.xxl },
  title: { ...type.display, color: colors.text, marginTop: spacing.xxl },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.md, fontSize: 17 },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.lg, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stepIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
  stepTitle: { ...type.bodyStrong, color: colors.text, fontSize: 17 },
  stepBody: { ...type.small, color: colors.textSecondary, marginTop: 4 },
  footer: { gap: spacing.md },
  privacy: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.text, textDecorationLine: 'underline' },
});
