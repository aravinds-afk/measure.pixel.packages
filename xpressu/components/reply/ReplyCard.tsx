import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { LIMITS } from '@/constants/config';
import { REPLY_STYLE_META } from '@/constants/tones';
import { colors, radius, spacing, type } from '@/constants/theme';
import type { ReplyStyle } from '@/types';

interface ReplyCardProps {
  style: ReplyStyle;
  text: string;
  edited: boolean;
  selected: boolean;
  regenerating: boolean;
  onSelect: () => void;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  onEdit: (text: string) => void;
  onResetEdit: () => void;
  index: number;
  readOnly?: boolean;
}

export function ReplyCard(props: ReplyCardProps) {
  const { style, text, edited, selected, regenerating, onSelect, onCopy, onRegenerate, onEdit, onResetEdit, index, readOnly } = props;
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const enter = useState(() => new Animated.Value(0))[0];
  const meta = REPLY_STYLE_META[style];

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 380, delay: index * 90, useNativeDriver: true }).start();
  }, [enter, index, text]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = () => {
    onSelect();
    onCopy(text);
    setCopied(true);
  };

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}>
      <Pressable
        onPress={editing ? undefined : copy}
        accessibilityRole="button"
        accessibilityLabel={`${meta.label} reply: ${text}. Tap to copy.`}
        style={({ pressed }) => [styles.card, selected && styles.selected, pressed && !editing && styles.pressed]}>
        <View style={styles.header}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, selected && styles.dotActive]} />
            <Text style={[styles.label, selected && { color: colors.accent }]}>{meta.label}</Text>
            {edited ? <Text style={styles.edited}>EDITED</Text> : null}
          </View>
          {copied ? (
            <View style={styles.copied}>
              <Ionicons name="checkmark" size={14} color={colors.success} />
              <Text style={styles.copiedText}>Copied</Text>
            </View>
          ) : (
            <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
          )}
        </View>

        {regenerating ? (
          <View style={styles.regenerating}>
            <Text style={styles.regeneratingText}>Writing a new one…</Text>
          </View>
        ) : editing ? (
          <TextInput
            value={text}
            onChangeText={(t) => onEdit(t.slice(0, LIMITS.replyMaxChars))}
            multiline
            autoFocus
            maxLength={LIMITS.replyMaxChars}
            selectionColor={colors.accent}
            style={[styles.text, styles.editInput]}
            accessibilityLabel={`Edit ${meta.label} reply`}
          />
        ) : (
          <Text style={styles.text} selectable>
            {text}
          </Text>
        )}

        <View style={styles.actions}>
          <IconButton icon={copied ? 'checkmark' : 'copy-outline'} label={copied ? 'Copied' : 'Copy'} onPress={copy} active={copied} />
          <IconButton
            icon={editing ? 'checkmark-done' : 'create-outline'}
            label={editing ? 'Done' : 'Edit'}
            onPress={() => setEditing((e) => !e)}
            active={editing}
          />
          {edited && !editing ? <IconButton icon="arrow-undo" label="Undo" showLabel={false} onPress={onResetEdit} /> : null}
          {!readOnly ? (
            <View style={styles.spacer}>
              <IconButton icon="refresh" label="Regenerate" showLabel={false} onPress={onRegenerate} loading={regenerating} disabled={editing} />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  selected: { borderColor: colors.accentBorder, backgroundColor: '#1A1519' },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  dotActive: { backgroundColor: colors.accent },
  label: { ...type.label, color: colors.textSecondary },
  edited: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  copied: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  copiedText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  text: { ...type.reply, color: colors.text },
  editInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  regenerating: { minHeight: 52, justifyContent: 'center' },
  regeneratingText: { ...type.body, color: colors.textMuted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  spacer: { marginLeft: 'auto' },
});
