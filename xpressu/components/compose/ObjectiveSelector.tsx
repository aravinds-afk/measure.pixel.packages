import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { OBJECTIVE_OPTIONS } from '@/constants/objectives';
import { spacing } from '@/constants/theme';
import type { Objective } from '@/types';

export function ObjectiveSelector({ value, onChange }: { value: Objective; onChange: (o: Objective) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="What are you trying to do?">
      {OBJECTIVE_OPTIONS.map((o) => (
        <Chip key={o.id} label={o.label} emoji={o.emoji} selected={o.id === value} onPress={() => onChange(o.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
