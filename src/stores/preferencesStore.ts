import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/lib/constants';

type PreferencesState = {
  backgroundPlayback: boolean;
  resumeOnLaunch: boolean;
  haptics: boolean;
  hydrated: boolean;
  setBackgroundPlayback: (value: boolean) => void;
  setResumeOnLaunch: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      backgroundPlayback: true,
      resumeOnLaunch: false,
      haptics: true,
      hydrated: false,
      setBackgroundPlayback: (value) => set({ backgroundPlayback: value }),
      setResumeOnLaunch: (value) => set({ resumeOnLaunch: value }),
      setHaptics: (value) => set({ haptics: value }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ backgroundPlayback, resumeOnLaunch, haptics }) => ({
        backgroundPlayback,
        resumeOnLaunch,
        haptics,
      }),
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hydrated: true });
      },
    },
  ),
);
