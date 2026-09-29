import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LIMITS } from '@/constants/config';
import { colors, radius, spacing, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface ConversationInputProps {
  value: string;
  onChange: (text: string) => void;
  onClear: () => void;
}

export function ConversationInput({ value, onChange, onClear }: ConversationInputProps) {
  const [focused, setFocused] = useState(false);
  const count = value.length;
  const max = LIMITS.conversationMaxChars;
  const nearLimit = count > max * 0.85;
  const trimmedForAi = count > LIMITS.conversationSentChars;

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (!text) return;
    haptics.tap();
    onChange((value ? `${value}\n${text}` : text).slice(0, max));
  };

  return (
    <View>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.slice(0, max))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={'Paste your conversation here...\n\nThem: so what do you do for fun?\nMe: ...'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={max}
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={colors.accent}
          style={styles.input}
          accessibilityLabel="Conversation"
          accessibilityHint="Paste the messages you want help replying to"
        />
        <View style={styles.toolbar}>
          {value ? (
            <Pressable onPress={onClear} style={styles.tool} accessibilityRole="button" accessibilityLabel="Clear conversation" hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.toolText}>Clear</Text>
            </Pressable>
          ) : (
            <Pressable onPress={paste} style={[styles.tool, styles.pasteTool]} accessibilityRole="button" accessibilityLabel="Paste from clipboard" hitSlop={8}>
              <Ionicons name="clipboard-outline" size={16} color={colors.accent} />
              <Text style={[styles.toolText, { color: colors.accent }]}>Paste</Text>
            </Pressable>
          )}
          <Text style={[styles.counter, nearLimit && { color: colors.warning }]} accessibilityLabel={`${count} of ${max} characters`}>
            {count.toLocaleString()}/{max.toLocaleString()}
          </Text>
        </View>
      </View>
      {trimmedForAi ? (
        <Text style={styles.note}>Long chat — only the most recent messages are sent to the AI.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  boxFocused: { borderColor: colors.accentBorder },
  input: {
    ...type.body,
    color: colors.text,
    minHeight: 190,
    maxHeight: 320,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.cardHigh },
  pasteTool: { backgroundColor: colors.accentSoft },
  toolText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  counter: { ...type.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  note: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm, marginLeft: spacing.xs },
});
