import { create } from 'zustand';

type CatalogueState = {
  version: number;
  lastSyncedAt: number;
  refresh: (options?: { force?: boolean }) => void;
  touch: () => void;
};

const MIN_REFRESH_INTERVAL_MS = 15_000;

export const useCatalogueStore = create<CatalogueState>()((set, get) => ({
  version: 0,
  lastSyncedAt: 0,
  refresh: (options) => {
    const now = Date.now();
    if (!options?.force && now - get().lastSyncedAt < MIN_REFRESH_INTERVAL_MS) {
      return;
    }
    set((state) => ({ version: state.version + 1, lastSyncedAt: now }));
  },
  touch: () => set((state) => ({ version: state.version + 1, lastSyncedAt: Date.now() })),
}));

export function refreshCatalogue(options?: { force?: boolean }): void {
  useCatalogueStore.getState().refresh(options);
}
