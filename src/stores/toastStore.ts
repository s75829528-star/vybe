import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

type ToastState = {
  id: number;
  message: string;
  kind: ToastKind;
  visible: boolean;
  show: (message: string, kind?: ToastKind, durationMs?: number) => void;
  hide: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>()((set, get) => ({
  id: 0,
  message: '',
  kind: 'info',
  visible: false,
  show: (message, kind = 'info', durationMs = 3200) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set((state) => ({
      id: state.id + 1,
      message,
      kind,
      visible: true,
    }));
    hideTimer = setTimeout(() => {
      get().hide();
    }, durationMs);
  },
  hide: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ visible: false });
  },
}));

export const toast = {
  show: (message: string, kind: ToastKind = 'info', durationMs?: number) =>
    useToastStore.getState().show(message, kind, durationMs),
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error', 4200),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
};
