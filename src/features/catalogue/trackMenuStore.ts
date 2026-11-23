import { create } from 'zustand';

import type { SongWithRelations } from '@/types/database';

export type TrackExtraAction = {
  label: string;
  icon: 'trash-outline' | 'add-circle-outline' | 'create-outline' | 'download-outline';
  destructive?: boolean;
  onPress: () => void | Promise<void>;
};

type TrackMenuState = {
  song: SongWithRelations | null;
  extra: TrackExtraAction | null;
  open: (song: SongWithRelations, extra?: TrackExtraAction) => void;
  close: () => void;
};

export const useTrackMenuStore = create<TrackMenuState>()((set) => ({
  song: null,
  extra: null,
  open: (song, extra) => set({ song, extra: extra ?? null }),
  close: () => set({ song: null, extra: null }),
}));

export function openTrackMenu(song: SongWithRelations, extra?: TrackExtraAction): void {
  useTrackMenuStore.getState().open(song, extra);
}
