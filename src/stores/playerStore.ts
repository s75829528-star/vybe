import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { create } from 'zustand';

import {
  ensurePlayer,
  mapRepeatMode,
  nextRepeatMode,
  requestNotificationPermission,
  seekSafely,
  toTrack,
  type PlayerRepeatMode,
} from '@/features/player/engine';
import { MAX_QUEUE_LENGTH, STORAGE_KEYS } from '@/lib/constants';
import { getErrorMessage, logError } from '@/lib/errors';
import { hapticSelection } from '@/lib/haptics';
import { recordSongPlay } from '@/services/history';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { toast } from '@/stores/toastStore';
import type { SongWithRelations } from '@/types/database';

type PlayerState = {
  ready: boolean;
  initializing: boolean;
  queue: SongWithRelations[];
  baseQueue: SongWithRelations[];
  activeIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  shuffle: boolean;
  repeatMode: PlayerRepeatMode;
  savedPosition: number;
  error: string | null;

  initialize: () => Promise<void>;
  playSongs: (songs: SongWithRelations[], startIndex?: number) => Promise<void>;
  playSong: (song: SongWithRelations, context?: SongWithRelations[]) => Promise<void>;
  playShuffled: (songs: SongWithRelations[]) => Promise<void>;
  resumeSong: (song: SongWithRelations) => Promise<void>;
  togglePlay: () => Promise<void>;
  pausePlayback: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeat: () => Promise<void>;
  addToQueue: (song: SongWithRelations) => Promise<void>;
  playNext: (song: SongWithRelations) => Promise<void>;
  removeFromQueue: (songId: string) => Promise<void>;
  jumpTo: (index: number) => Promise<void>;
  clearQueue: () => Promise<void>;
  saveSession: () => Promise<void>;
  reset: () => Promise<void>;
  handlePlaybackState: (state: State) => void;
  handleActiveTrackChanged: (index: number | undefined) => void;
  handleQueueEnded: () => void;
};

type PersistedSession = {
  version: 1;
  queue: SongWithRelations[];
  baseQueue: SongWithRelations[];
  activeIndex: number;
  position: number;
  shuffle: boolean;
  repeatMode: PlayerRepeatMode;
  updatedAt: string;
};

let initializePromise: Promise<void> | null = null;
let listenersBound = false;
let positionTimer: ReturnType<typeof setInterval> | null = null;
let saveDebounce: ReturnType<typeof setTimeout> | null = null;
let saveInFlight = false;
let lastRecordedTrackId: string | null = null;
let nativeActiveIndex = 0;

function isSong(value: unknown): value is SongWithRelations {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SongWithRelations>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.audio_url === 'string' &&
    candidate.audio_url.startsWith('https://')
  );
}

function sanitizeQueue(value: unknown): SongWithRelations[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SongWithRelations[] = [];
  for (const item of value) {
    if (!isSong(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= MAX_QUEUE_LENGTH) break;
  }
  return result;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

async function loadPersistedSession(): Promise<PersistedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.playerSession);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (parsed.version !== 1) return null;
    const queue = sanitizeQueue(parsed.queue);
    const baseQueue = sanitizeQueue(parsed.baseQueue);
    if (queue.length === 0) return null;

    const repeatMode: PlayerRepeatMode =
      parsed.repeatMode === 'one' || parsed.repeatMode === 'all' ? parsed.repeatMode : 'off';
    const activeIndex =
      typeof parsed.activeIndex === 'number' && parsed.activeIndex >= 0
        ? Math.min(parsed.activeIndex, queue.length - 1)
        : 0;

    return {
      version: 1,
      queue,
      baseQueue: baseQueue.length > 0 ? baseQueue : queue,
      activeIndex,
      position:
        typeof parsed.position === 'number' && Number.isFinite(parsed.position)
          ? Math.max(0, parsed.position)
          : 0,
      shuffle: Boolean(parsed.shuffle),
      repeatMode,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch (error) {
    logError('player/loadSession', error);
    return null;
  }
}

async function rebuildNativeQueue(
  queue: SongWithRelations[],
  activeIndex: number,
  position: number,
  shouldPlay: boolean,
  repeatMode: PlayerRepeatMode,
): Promise<void> {
  await TrackPlayer.reset();
  if (queue.length > 0) {
    await TrackPlayer.add(queue.map(toTrack));
    await TrackPlayer.setRepeatMode(mapRepeatMode(repeatMode));
    if (activeIndex > 0) {
      await TrackPlayer.skip(activeIndex);
    }
    if (position > 0.5) {
      await TrackPlayer.seekTo(position);
    }
  }
  if (!shouldPlay && queue.length > 0) {
    await TrackPlayer.pause();
  }
  if (shouldPlay) {
    await TrackPlayer.play();
  }
}

async function currentPosition(): Promise<number> {
  try {
    const progress = await TrackPlayer.getProgress();
    return Number.isFinite(progress.position) ? Math.max(0, progress.position) : 0;
  } catch {
    return 0;
  }
}

export const usePlayerStore = create<PlayerState>()((set, get) => {
  const scheduleSave = () => {
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
      void get().saveSession();
    }, 1200);
  };

  const startTimer = () => {
    if (positionTimer) clearInterval(positionTimer);
    positionTimer = setInterval(() => {
      if (get().isPlaying) {
        void get().saveSession();
      }
    }, 20_000);
  };

  return {
    ready: false,
    initializing: false,
    queue: [],
    baseQueue: [],
    activeIndex: 0,
    isPlaying: false,
    isBuffering: false,
    shuffle: false,
    repeatMode: 'off',
    savedPosition: 0,
    error: null,

    initialize: async () => {
      if (initializePromise) return initializePromise;

      initializePromise = (async () => {
        if (get().ready) return;
        set({ initializing: true, error: null });

        try {
          await ensurePlayer();

          if (!listenersBound) {
            listenersBound = true;

            TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
              get().handlePlaybackState(event.state);
            });

            TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
              get().handleActiveTrackChanged(event.index);
            });

            TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
              logError('player/native', event);
              set({ isPlaying: false, isBuffering: false, error: event.message });
              toast.error(event.message || 'Playback failed.');
            });

            TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
              get().handleQueueEnded();
            });
          }

          await TrackPlayer.setRepeatMode(mapRepeatMode(get().repeatMode));

          const persisted = await loadPersistedSession();
          if (persisted) {
            await rebuildNativeQueue(
              persisted.queue,
              persisted.activeIndex,
              persisted.position,
              false,
              persisted.repeatMode,
            );
            nativeActiveIndex = persisted.activeIndex;
            set({
              queue: persisted.queue,
              baseQueue: persisted.baseQueue,
              activeIndex: persisted.activeIndex,
              shuffle: persisted.shuffle,
              repeatMode: persisted.repeatMode,
              savedPosition: persisted.position,
              isPlaying: false,
              ready: true,
              initializing: false,
              error: null,
            });
            lastRecordedTrackId = null;

            if (usePreferencesStore.getState().resumeOnLaunch) {
              try {
                await requestNotificationPermission();
                await TrackPlayer.play();
              } catch (error) {
                logError('player/resumeOnLaunch', error);
              }
            }
          } else {
            set({ ready: true, initializing: false });
          }

          startTimer();
        } catch (error) {
          initializePromise = null;
          const message = getErrorMessage(error, 'The audio player could not be started.');
          logError('player/initialize', error);
          set({ ready: false, initializing: false, error: message });
          toast.error(message);
        }
      })();

      return initializePromise;
    },

    playSongs: async (songs, startIndex = 0) => {
      const valid = sanitizeQueue(songs);
      if (valid.length === 0) {
        toast.error('There are no playable songs here yet.');
        return;
      }

      const safeIndex = Math.max(0, Math.min(startIndex, valid.length - 1));
      const selected = valid[safeIndex]!;
      const shouldShuffle = get().shuffle;
      const playbackQueue = shouldShuffle
        ? [selected, ...shuffled(valid.filter((song) => song.id !== selected.id))].slice(
            0,
            MAX_QUEUE_LENGTH,
          )
        : valid;

      try {
        await ensurePlayer();
        await requestNotificationPermission();
        await rebuildNativeQueue(
          playbackQueue,
          shouldShuffle ? 0 : safeIndex,
          0,
          true,
          get().repeatMode,
        );

        const nextIndex = shouldShuffle ? 0 : safeIndex;
        nativeActiveIndex = nextIndex;
        lastRecordedTrackId = null;
        set({
          queue: playbackQueue,
          baseQueue: valid,
          activeIndex: nextIndex,
          isPlaying: true,
          isBuffering: false,
          savedPosition: 0,
          ready: true,
          error: null,
        });
        scheduleSave();
      } catch (error) {
        const message = getErrorMessage(error, 'This song could not be played.');
        logError('player/playSongs', error);
        set({ isPlaying: false, error: message });
        toast.error(message);
      }
    },

    playSong: async (song, context) => {
      if (context && context.length > 0) {
        const index = context.findIndex((item) => item.id === song.id);
        await get().playSongs(context, index >= 0 ? index : 0);
        return;
      }

      const existingIndex = get().queue.findIndex((item) => item.id === song.id);
      if (existingIndex >= 0) {
        await get().jumpTo(existingIndex);
        return;
      }
      await get().playSongs([song], 0);
    },

    playShuffled: async (songs) => {
      if (songs.length === 0) {
        toast.error('There are no playable songs here yet.');
        return;
      }
      set({ shuffle: true });
      const start = Math.floor(Math.random() * songs.length);
      await get().playSongs(songs, start);
    },

    resumeSong: async (song) => {
      const state = get();
      const queueIndex = state.queue.findIndex((item) => item.id === song.id);
      if (queueIndex === state.activeIndex) {
        if (!state.isPlaying) {
          await get().togglePlay();
        }
        return;
      }
      if (queueIndex >= 0) {
        await get().jumpTo(queueIndex);
        return;
      }
      await get().playSongs([song], 0);
    },

    togglePlay: async () => {
      if (get().queue.length === 0) {
        toast.info('Choose a song to start listening.');
        return;
      }

      try {
        await ensurePlayer();
        const playWhenReady = await TrackPlayer.getPlayWhenReady();
        if (playWhenReady) {
          await TrackPlayer.pause();
          set({ isPlaying: false });
          scheduleSave();
        } else {
          await requestNotificationPermission();
          if (get().activeIndex < 0) {
            await TrackPlayer.skip(0);
          }
          await TrackPlayer.play();
          set({ isPlaying: true, error: null });
        }
      } catch (error) {
        const message = getErrorMessage(error, 'Playback could not be changed.');
        logError('player/togglePlay', error);
        toast.error(message);
      }
    },

    pausePlayback: async () => {
      try {
        await TrackPlayer.pause();
        set({ isPlaying: false });
        await get().saveSession();
      } catch (error) {
        logError('player/pausePlayback', error);
      }
    },

    next: async () => {
      if (get().queue.length === 0) return;
      try {
        await TrackPlayer.skipToNext();
      } catch {
        if (get().repeatMode === 'all') {
          try {
            await TrackPlayer.skip(0);
            await TrackPlayer.play();
          } catch (error) {
            logError('player/nextWrap', error);
          }
        } else {
          toast.info('You have reached the end of the queue.');
        }
      }
      scheduleSave();
    },

    previous: async () => {
      if (get().queue.length === 0) return;
      try {
        const { position } = await TrackPlayer.getProgress();
        if (position > 3) {
          await TrackPlayer.seekTo(0);
        } else {
          await TrackPlayer.skipToPrevious();
        }
      } catch {
        if (get().repeatMode === 'all') {
          const lastIndex = get().queue.length - 1;
          try {
            await TrackPlayer.skip(lastIndex);
            await TrackPlayer.play();
          } catch (error) {
            logError('player/previousWrap', error);
          }
        } else {
          await TrackPlayer.seekTo(0);
        }
      }
      scheduleSave();
    },

    seek: async (seconds) => {
      try {
        await seekSafely(seconds);
        set({ savedPosition: seconds });
        scheduleSave();
      } catch (error) {
        logError('player/seek', error);
      }
    },

    toggleShuffle: async () => {
      const state = get();
      hapticSelection();

      if (state.queue.length === 0) {
        set({ shuffle: !state.shuffle });
        scheduleSave();
        return;
      }

      const currentSong = state.queue[state.activeIndex] ?? state.queue[0]!;
      const position = await currentPosition();
      const enabling = !state.shuffle;

      let nextQueue: SongWithRelations[];
      let nextIndex: number;

      if (enabling) {
        const remaining = state.baseQueue.filter((song) => song.id !== currentSong.id);
        nextQueue = [currentSong, ...shuffled(remaining)].slice(0, MAX_QUEUE_LENGTH);
        nextIndex = 0;
      } else {
        const baseIndex = state.baseQueue.findIndex((song) => song.id === currentSong.id);
        nextQueue = baseIndex >= 0 ? state.baseQueue : [currentSong, ...state.baseQueue];
        nextIndex = baseIndex >= 0 ? baseIndex : 0;
      }

      try {
        await rebuildNativeQueue(
          nextQueue,
          nextIndex,
          position,
          state.isPlaying,
          state.repeatMode,
        );
        nativeActiveIndex = nextIndex;
        set({
          shuffle: enabling,
          queue: nextQueue,
          activeIndex: nextIndex,
          baseQueue: state.baseQueue.length > 0 ? state.baseQueue : nextQueue,
        });
        scheduleSave();
      } catch (error) {
        logError('player/toggleShuffle', error);
        toast.error('Shuffle could not be changed right now.');
      }
    },

    cycleRepeat: async () => {
      const next = nextRepeatMode(get().repeatMode);
      hapticSelection();
      set({ repeatMode: next });
      try {
        await TrackPlayer.setRepeatMode(mapRepeatMode(next));
        scheduleSave();
      } catch (error) {
        logError('player/cycleRepeat', error);
      }
    },

    addToQueue: async (song) => {
      if (get().queue.length === 0) {
        await get().playSongs([song], 0);
        return;
      }
      if (get().queue.some((item) => item.id === song.id)) {
        toast.info('That song is already in your queue.');
        return;
      }
      if (get().queue.length >= MAX_QUEUE_LENGTH) {
        toast.info('Your queue is full.');
        return;
      }

      try {
        await ensurePlayer();
        await TrackPlayer.add(toTrack(song));
        set((state) => ({
          queue: [...state.queue, song],
          baseQueue: [...state.baseQueue, song],
        }));
        scheduleSave();
        toast.success('Added to queue');
      } catch (error) {
        logError('player/addToQueue', error);
        toast.error('Could not add that song to the queue.');
      }
    },

    playNext: async (song) => {
      if (get().queue.length === 0) {
        await get().playSongs([song], 0);
        return;
      }
      if (get().queue.some((item) => item.id === song.id)) {
        toast.info('That song is already in your queue.');
        return;
      }

      const insertAt = Math.min(get().activeIndex + 1, get().queue.length);
      try {
        await ensurePlayer();
        await TrackPlayer.add(toTrack(song), insertAt);
        set((state) => {
          const queue = [...state.queue];
          const baseQueue = [...state.baseQueue];
          queue.splice(insertAt, 0, song);

          const currentBaseIndex = baseQueue.findIndex(
            (item) => item.id === state.queue[state.activeIndex]?.id,
          );
          baseQueue.splice(currentBaseIndex >= 0 ? currentBaseIndex + 1 : baseQueue.length, 0, song);

          return { queue, baseQueue };
        });
        scheduleSave();
        toast.success('Playing next');
      } catch (error) {
        logError('player/playNext', error);
        toast.error('Could not add that song to play next.');
      }
    },

    removeFromQueue: async (songId) => {
      const state = get();
      const index = state.queue.findIndex((item) => item.id === songId);
      if (index < 0) return;
      if (index === state.activeIndex) {
        toast.info("You can't remove the song that's currently playing.");
        return;
      }

      try {
        await TrackPlayer.remove(index);
        const queue = state.queue.filter((item) => item.id !== songId);
        const baseQueue = state.baseQueue.filter((item) => item.id !== songId);
        const activeIndex = index < state.activeIndex ? state.activeIndex - 1 : state.activeIndex;
        set({ queue, baseQueue, activeIndex });
        nativeActiveIndex = activeIndex;
        scheduleSave();
      } catch (error) {
        logError('player/removeFromQueue', error);
        toast.error('Could not remove that song from the queue.');
      }
    },

    jumpTo: async (index) => {
      const state = get();
      if (index < 0 || index >= state.queue.length) return;
      try {
        await ensurePlayer();
        await TrackPlayer.skip(index);
        await TrackPlayer.play();
        set({ activeIndex: index, isPlaying: true, error: null });
        nativeActiveIndex = index;
        scheduleSave();
      } catch (error) {
        logError('player/jumpTo', error);
        toast.error('That song could not be played.');
      }
    },

    clearQueue: async () => {
      try {
        await TrackPlayer.reset();
      } catch {
        // Player may not be initialized.
      }
      set({
        queue: [],
        baseQueue: [],
        activeIndex: 0,
        isPlaying: false,
        isBuffering: false,
        savedPosition: 0,
      });
      await AsyncStorage.removeItem(STORAGE_KEYS.playerSession).catch(() => undefined);
    },

    saveSession: async () => {
      if (saveInFlight) return;
      const state = get();
      if (state.queue.length === 0) {
        return;
      }

      saveInFlight = true;
      try {
        const position = await currentPosition();
        const session: PersistedSession = {
          version: 1,
          queue: state.queue,
          baseQueue: state.baseQueue,
          activeIndex: state.activeIndex,
          position,
          shuffle: state.shuffle,
          repeatMode: state.repeatMode,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.playerSession, JSON.stringify(session));
        set({ savedPosition: position });
      } catch (error) {
        logError('player/saveSession', error);
      } finally {
        saveInFlight = false;
      }
    },

    reset: async () => {
      if (saveDebounce) {
        clearTimeout(saveDebounce);
        saveDebounce = null;
      }
      try {
        await TrackPlayer.reset();
      } catch {
        // Player may not be initialized.
      }
      lastRecordedTrackId = null;
      nativeActiveIndex = 0;
      set({
        queue: [],
        baseQueue: [],
        activeIndex: 0,
        isPlaying: false,
        isBuffering: false,
        shuffle: false,
        repeatMode: 'off',
        savedPosition: 0,
        error: null,
      });
      await AsyncStorage.removeItem(STORAGE_KEYS.playerSession).catch(() => undefined);
    },

    handlePlaybackState: (state) => {
      if (state === State.Playing) {
        set({ isPlaying: true, isBuffering: false, error: null });
        const queue = get().queue;
        const track = queue[get().activeIndex];
        if (track && track.id !== lastRecordedTrackId) {
          lastRecordedTrackId = track.id;
          void recordSongPlay(track.id);
        }
        scheduleSave();
        return;
      }

      if (state === State.Loading || state === State.Buffering) {
        set({ isBuffering: true });
        return;
      }

      set({ isPlaying: false, isBuffering: false });
      scheduleSave();
    },

    handleActiveTrackChanged: (index) => {
      if (index == null) return;
      nativeActiveIndex = index;
      lastRecordedTrackId = null;
      set({ activeIndex: index, savedPosition: 0 });
      scheduleSave();
    },

    handleQueueEnded: () => {
      set({ isPlaying: false, isBuffering: false });
      scheduleSave();
    },
  };
});

/** Keeps the native active index available for diagnostics in development. */
export function getNativeActiveIndex(): number {
  return nativeActiveIndex;
}
