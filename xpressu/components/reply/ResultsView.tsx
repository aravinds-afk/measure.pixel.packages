import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/providers/ToastProvider';
import { Banner } from '@/components/ui/Banner';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { REPLY_STYLE_META } from '@/constants/tones';
import { colors, spacing, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { GenerateResponse, ReplyStyle } from '@/types';

import { AnalysisPanel } from './AnalysisPanel';
import { InsightCard } from './InsightCard';
import { ReplyCard } from './ReplyCard';

interface ResultsViewProps {
  response: GenerateResponse;
  edits: Partial<Record<ReplyStyle, string>>;
  regenerating: ReplyStyle[];
  onRegenerateOne?: (style: ReplyStyle) => void;
  onEdit: (style: ReplyStyle, text: string) => void;
  onResetEdit: (style: ReplyStyle) => void;
  analysisLocked: boolean;
  onUnlockAnalysis: () => void;
}

export function ResultsView({ response, edits, regenerating, onRegenerateOne, onEdit, onResetEdit, analysisLocked, onUnlockAnalysis }: ResultsViewProps) {
  const toast = useToast();
  const [selected, setSelected] = useState<ReplyStyle>(response.replies[0]?.style ?? 'confident');
  const selectedReply = response.replies.find((r) => r.style === selected) ?? response.replies[0];
  const safety = response.safety;

  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      haptics.success();
      toast.show('Copied — paste it in your chat');
    } catch {
      toast.show('Couldn’t copy. Long-press the text instead.', 'error');
    }
  };

  return (
    <View style={styles.root}>
      {safety && safety.signal === 'boundary' ? (
        <Banner
          tone="warning"
          icon="hand-left"
          title="They’ve set a boundary"
          message={safety.guidance || 'The respectful move is to acknowledge it and step back — or not reply at all.'}
        />
      ) : safety && safety.signal === 'low_interest' ? (
        <Banner tone="info" icon="pulse" title="Low engagement" message={safety.guidance || 'Keep it light and don’t over-invest.'} />
      ) : null}

      <View style={styles.cards}>
        {response.replies.map((reply, i) => (
          <ReplyCard
            key={reply.style}
            index={i}
            style={reply.style}
            text={edits[reply.style] ?? reply.text}
            edited={edits[reply.style] !== undefined}
            selected={selected === reply.style}
            regenerating={regenerating.includes(reply.style)}
            onSelect={() => setSelected(reply.style)}
            onCopy={copy}
            onRegenerate={() => onRegenerateOne?.(reply.style)}
            onEdit={(t) => onEdit(reply.style, t)}
            onResetEdit={() => onResetEdit(reply.style)}
            readOnly={!onRegenerateOne}
          />
        ))}
      </View>

      <Text style={styles.hint}>Tap a reply to copy it.</Text>

      <View style={styles.insights}>
        <SectionLabel>Insights</SectionLabel>
        {selectedReply ? (
          <InsightCard icon="bulb" title="Why this works" caption={REPLY_STYLE_META[selectedReply.style].label} body={selectedReply.why} />
        ) : null}
        <InsightCard icon="navigate" title="Next move" body={response.nextMove} />
        <AnalysisPanel analysis={response.analysis} locked={analysisLocked} onUnlock={onUnlockAnalysis} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  cards: { gap: spacing.md },
  hint: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  insights: { gap: spacing.md, marginTop: spacing.sm },
});
