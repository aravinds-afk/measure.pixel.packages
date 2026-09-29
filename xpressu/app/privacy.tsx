import { Linking, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '@/constants/config';
import { colors, spacing, type } from '@/constants/theme';
import { isMockAi } from '@/lib/env';

const POINTS = [
  {
    title: 'Not stored by default',
    body: 'Conversations you paste stay in memory while you use them and are discarded when you start a new chat or close the app. History is off unless you turn it on.',
  },
  {
    title: 'Encrypted on your device',
    body: 'If you enable history, it’s saved in your phone’s secure storage (iOS Keychain / Android Keystore) — never on our servers. Delete it any time in Settings.',
  },
  {
    title: 'Minimal data sent to the AI',
    body: 'Only the most recent part of the conversation is sent, with emails, phone numbers and links removed (you can control this in Settings). No names, contacts or account info are attached.',
  },
  {
    title: 'Not logged, not used for training',
    body: 'Our server forwards the text to the AI provider to generate replies and does not log or store it. We request that the provider does not retain it for training.',
  },
  {
    title: 'No API keys in the app',
    body: 'All AI requests go through our secure backend. The app never contains secret keys.',
  },
  {
    title: 'What we do store',
    body: 'An anonymous account ID and a daily usage counter (to enforce the free limit), and your subscription status. That’s it.',
  },
];

export default function Privacy() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Privacy" />
      <Text style={styles.intro}>Your conversations are personal. Here’s exactly how XpressU treats them.</Text>
      {isMockAi ? (
        <Text style={styles.mock}>Demo mode: replies are generated on this device. Nothing is sent anywhere.</Text>
      ) : null}
      <View style={styles.list}>
        {POINTS.map((p) => (
          <Card key={p.title} style={styles.card}>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.body}>{p.body}</Text>
          </Card>
        ))}
      </View>
      <Card style={styles.policy}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.body}>
          [PLACEHOLDER] The full privacy policy will be published at{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            {PRIVACY_POLICY_URL}
          </Text>
          . It must cover: data collected, AI sub-processors (e.g. OpenAI), retention, user rights (access, deletion), children’s privacy (18+ only), and
          contact details. Questions: {SUPPORT_EMAIL}.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  mock: { ...type.small, color: colors.warning, marginBottom: spacing.lg },
  list: { gap: spacing.md },
  card: { padding: spacing.lg },
  title: { ...type.bodyStrong, color: colors.text, marginBottom: 4 },
  body: { ...type.small, color: colors.textSecondary },
  policy: { padding: spacing.lg, marginTop: spacing.xl, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.borderStrong },
  link: { color: colors.accent, textDecorationLine: 'underline' },
});
