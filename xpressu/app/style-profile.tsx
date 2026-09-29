import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { LIMITS } from '@/constants/config';
import { colors, radius, spacing, type } from '@/constants/theme';
import { entitlements } from '@/services/subscription';
import type { UserStyle } from '@/types';

type Option<T extends string> = { id: T; label: string };

const EMOJI: Option<UserStyle['emoji']>[] = [
  { id: 'never', label: 'Never' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'often', label: 'A lot 😂' },
];
const CASING: Option<UserStyle['casing']>[] = [
  { id: 'normal', label: 'Normal Caps' },
  { id: 'lowercase', label: 'all lowercase' },
];
const LENGTH: Option<UserStyle['length']>[] = [
  { id: 'short', label: 'Short & punchy' },
  { id: 'medium', label: 'A bit longer' },
];

function Segmented<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip key={o.id} label={o.label} selected={value === o.id} onPress={() => onChange(o.id)} />
      ))}
    </View>
  );
}

export default function StyleProfile() {
  const app = useApp();
  const toast = useToast();
  const [style, setStyle] = useState<UserStyle>(app.userStyle);
  const locked = !entitlements.canUseStyleProfile(app.isPremium);
  const set = <K extends keyof UserStyle>(key: K, value: UserStyle[K]) => setStyle((s) => ({ ...s, [key]: value }));

  const save = async () => {
    if (locked) {
      router.push('/paywall');
      return;
    }
    await app.updateUserStyle(style);
    if (!app.preferences.useStyleProfile) await app.updatePreferences({ useStyleProfile: true });
    toast.show('Texting style saved');
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button label={locked ? 'Unlock with Premium' : 'Save my style'} icon={locked ? 'diamond' : 'checkmark'} onPress={save} />}>
      <ScreenHeader title="How I normally text" />
      <Text style={styles.intro}>XpressU adapts every reply to sound like you — your rhythm, your punctuation, your vibe.</Text>

      {locked ? (
        <View style={styles.section}>
          <Banner tone="accent" icon="diamond" title="Premium feature" message="You can fill this in now; it’s applied to replies once you’re on Premium." />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>Paste a few messages you’ve sent</SectionLabel>
        <TextInput
          value={style.samples}
          onChangeText={(t) => set('samples', t.slice(0, LIMITS.userStyleMaxChars))}
          placeholder={'haha no way, that’s actually wild\nok but hear me out… tacos\nyou’re trouble lol'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={LIMITS.userStyleMaxChars}
          selectionColor={colors.accent}
          textAlignVertical="top"
          style={styles.samples}
          accessibilityLabel="Example messages"
        />
        <Text style={styles.counter}>
          {style.samples.length}/{LIMITS.userStyleMaxChars} · Only use messages you wrote. Don’t include names or numbers.
        </Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>Emojis</SectionLabel>
        <Segmented options={EMOJI} value={style.emoji} onChange={(v) => set('emoji', v)} />
      </View>
      <View style={styles.section}>
        <SectionLabel>Capitalization</SectionLabel>
        <Segmented options={CASING} value={style.casing} onChange={(v) => set('casing', v)} />
      </View>
      <View style={styles.section}>
        <SectionLabel>Message length</SectionLabel>
        <Segmented options={LENGTH} value={style.length} onChange={(v) => set('length', v)} />
      </View>
      <View style={styles.section}>
        <SectionLabel>Anything else?</SectionLabel>
        <TextInput
          value={style.notes}
          onChangeText={(t) => set('notes', t.slice(0, 200))}
          placeholder="e.g. dry humor, never use “lol”, I’m a bit nerdy"
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          selectionColor={colors.accent}
          style={styles.notes}
          accessibilityLabel="Style notes"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm },
  section: { marginTop: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  samples: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 130,
  },
  counter: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  notes: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
});
