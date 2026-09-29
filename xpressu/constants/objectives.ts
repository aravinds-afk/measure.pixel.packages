import type { Objective } from '@/types';

export interface ObjectiveOption {
  id: Objective;
  label: string;
  emoji: string;
  hint: string;
}

export const OBJECTIVE_OPTIONS: ObjectiveOption[] = [
  { id: 'keep_going', label: 'Keep it going', emoji: '💬', hint: 'Keep the conversation flowing' },
  { id: 'flirt', label: 'Flirt', emoji: '😏', hint: 'Add some spark' },
  { id: 'ask_out', label: 'Ask them out', emoji: '📍', hint: 'Suggest a plan' },
  { id: 'recover_dry', label: 'Revive a dry chat', emoji: '🔥', hint: 'Recover a dry conversation' },
  { id: 'answer_question', label: 'Answer their question', emoji: '❓', hint: 'Reply to their question' },
  { id: 'move_to_date', label: 'Text → date', emoji: '🍸', hint: 'Move from texting to a date' },
  { id: 'end_gracefully', label: 'End it kindly', emoji: '👋', hint: 'End the conversation gracefully' },
];

export function objectiveLabel(id: Objective): string {
  return OBJECTIVE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
