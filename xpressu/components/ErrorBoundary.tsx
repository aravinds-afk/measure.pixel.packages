import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing, type } from '@/constants/theme';

/** Route-level error boundary (exported from app/_layout.tsx). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something broke.</Text>
      <Text style={styles.body}>{__DEV__ ? error.message : 'An unexpected error occurred. Your data is safe.'}</Text>
      <Button label="Try again" onPress={retry} icon="refresh" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
