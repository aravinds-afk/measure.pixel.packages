import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: 'lg' | 'md' | 'sm';
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, size = 'lg', style, accessibilityHint }: ButtonProps) {
  const scale = useState(() => new Animated.Value(1))[0];
  const inactive = disabled || loading;

  const animate = (to: number) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const height = size === 'lg' ? 58 : size === 'md' ? 48 : 38;
  const fontSize = size === 'lg' ? 17 : size === 'md' ? 15 : 14;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.text;

  const content = (
    <View style={[styles.content, { height }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={fontSize + 3} color={fg} /> : null}
          <Text style={[styles.label, { color: fg, fontSize }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, inactive && styles.disabled, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!inactive, busy: !!loading }}
        disabled={inactive}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        style={[
          styles.base,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          variant === 'danger' && styles.dangerStyle,
        ]}>
        {variant === 'primary' ? (
          <LinearGradient colors={[colors.accent, '#FF5F8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
            {content}
          </LinearGradient>
        ) : (
          content
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, overflow: 'hidden' },
  gradient: { borderRadius: radius.lg },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  label: { fontWeight: '700', letterSpacing: -0.2 },
  secondary: { backgroundColor: colors.cardHigh, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  dangerStyle: { backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(248,113,113,0.35)' },
  disabled: { opacity: 0.45 },
});
