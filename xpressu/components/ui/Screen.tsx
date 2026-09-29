import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
}

/** Safe-area aware, keyboard-aware, width-constrained screen container. */
export function Screen({ children, scroll = true, edges = ['top'], footer, contentStyle, keyboardShouldPersistTaps = 'handled' }: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>
      <View style={[styles.inner, styles.flex]}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? <View style={styles.footer}><View style={styles.inner}>{footer}</View></View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxxl, flexGrow: 1 },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
