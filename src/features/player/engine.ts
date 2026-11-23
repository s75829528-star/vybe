import {
  AndroidAudioContentType,
  AppKilledPlaybackBehavior,
  Capability,
  IOSCategory,
  IOSCategoryMode,
  RepeatMode,
  type AddTrack,
} from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { PermissionsAndroid, Platform } from 'react-native';

import type { SongWithRelations } from '@/types/database';

export type PlayerRepeatMode = 'off' | 'all' | 'one';

let setupPromise: Promise<void> | null = null;
let notificationPermissionRequested = false;

export const PLAYER_CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.Stop,
];

async function performSetup(): Promise<void> {
  try {
    await TrackPlayer.setupPlayer({
      minBuffer: 10,
      maxBuffer: 60,
      playBuffer: 2,
      backBuffer: 30,
      autoHandleInterruptions: true,
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      androidAudioContentType: AndroidAudioContentType.Music,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already')) {
      throw error;
    }
  }

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      alwaysPauseOnInterruption: false,
    },
    capabilities: PLAYER_CAPABILITIES,
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    notificationCapabilities: PLAYER_CAPABILITIES,
    progressUpdateEventInterval: 1,
    icon: require('../../../assets/images/notification-icon.png'),
    color: 0xa855f7,
  });
}

export function ensurePlayer(): Promise<void> {
  if (!setupPromise) {
    setupPromise = performSetup().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

export function toTrack(song: SongWithRelations): AddTrack {
  if (!song.audio_url) {
    throw new Error(`"${song.title}" does not have a playable audio URL.`);
  }

  return {
    id: song.id,
    url: song.audio_url,
    title: song.title,
    artist: song.artist?.name ?? 'Unknown artist',
    album: song.album?.title ?? undefined,
    artwork: song.cover_url ?? undefined,
    duration: song.duration_seconds ?? undefined,
    genre: song.genre,
  };
}

export function mapRepeatMode(mode: PlayerRepeatMode): RepeatMode {
  if (mode === 'one') return RepeatMode.Track;
  if (mode === 'all') return RepeatMode.Queue;
  return RepeatMode.Off;
}

export function nextRepeatMode(mode: PlayerRepeatMode): PlayerRepeatMode {
  if (mode === 'off') return 'all';
  if (mode === 'all') return 'one';
  return 'off';
}

export async function seekSafely(seconds: number): Promise<void> {
  const duration = await TrackPlayer.getProgress()
    .then((progress) => progress.duration)
    .catch(() => 0);
  const clamped = Math.max(0, Math.min(seconds, duration > 0 ? duration : seconds));
  await TrackPlayer.seekTo(clamped);
}

export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  if (notificationPermissionRequested) return;
  notificationPermissionRequested = true;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // A denied notification permission only hides playback controls; audio
    // still works. Do not block playback.
  }
}

export async function stopAndResetPlayer(): Promise<void> {
  try {
    await TrackPlayer.reset();
  } catch {
    // The player may not be initialized yet.
  }
}
