import * as Haptics from 'expo-haptics';

import { usePreferencesStore } from '@/stores/preferencesStore';

function enabled(): boolean {
  return usePreferencesStore.getState().haptics;
}

export function hapticLight(): void {
  if (!enabled()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function hapticSelection(): void {
  if (!enabled()) return;
  void Haptics.selectionAsync().catch(() => undefined);
}

export function hapticSuccess(): void {
  if (!enabled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticError(): void {
  if (!enabled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}
