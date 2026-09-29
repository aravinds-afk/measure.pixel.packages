import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

interface ScreenHeaderProps {
  title?: string;
  back?: boolean;
  close?: boolean;
  right?: ReactNode;
}

/** Minimal header for stack screens. */
export function ScreenHeader({ title, back = true, close, right }: ScreenHeaderProps) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  return (
    <View style={styles.row}>
      {back || close ? (
        <Pressable onPress={goBack} hitSlop={12} style={styles.btn} accessibilityRole="button" accessibilityLabel={close ? 'Close' : 'Back'}>
          <Ionicons name={close ? 'close' : 'chevron-back'} size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.btnPlaceholder} />
      )}
      {title ? (
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 52, gap: spacing.md },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  btnPlaceholder: { width: 0 },
  title: { ...type.heading, color: colors.text, flex: 1 },
  flex: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
