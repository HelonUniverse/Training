import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Envoltorio silencioso: en web o si el dispositivo no soporta, no falla. */
const safe = (fn: () => Promise<unknown>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const press = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const success = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const select = () => safe(() => Haptics.selectionAsync());
export const warn = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
