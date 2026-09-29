import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function run(fn: () => Promise<void>) {
  if (!enabled || Platform.OS === 'web') return;
  fn().catch(() => {});
}

export const haptics = {
  tap: () => run(() => Haptics.selectionAsync()),
  impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
