import { mapRepeatMode, nextRepeatMode, toTrack } from '@/features/player/engine';
import type { SongWithRelations } from '@/types/database';

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {},
  RepeatMode: { Off: 'off', Track: 'track', Queue: 'queue' },
  AndroidAudioContentType: { Music: 'music' },
  AppKilledPlaybackBehavior: { ContinuePlayback: 'continue' },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    SkipToNext: 'next',
    SkipToPrevious: 'previous',
    SeekTo: 'seek',
    Stop: 'stop',
  },
  IOSCategory: { Playback: 'playback' },
  IOSCategoryMode: { Default: 'default' },
}));


const song = {
  id: 'song-1',
  title: 'Midnight Drive',
  artist: { id: 'artist-1', name: 'VYBE Collective' },
  album: { id: 'album-1', title: 'Night Signals' },
  audio_url: 'https://res.cloudinary.com/demo/video/upload/vybe/audio/demo.mp3',
  cover_url: 'https://res.cloudinary.com/demo/image/upload/vybe/artwork/demo.jpg',
  duration_seconds: 215,
  genre: 'Electronic',
} as SongWithRelations;

describe('repeat mode mapping', () => {
  it('maps the app repeat modes to native modes', () => {
    expect(mapRepeatMode('off')).toBe('off');
    expect(mapRepeatMode('all')).toBe('queue');
    expect(mapRepeatMode('one')).toBe('track');
  });

  it('cycles off → all → one → off', () => {
    expect(nextRepeatMode('off')).toBe('all');
    expect(nextRepeatMode('all')).toBe('one');
    expect(nextRepeatMode('one')).toBe('off');
  });
});

describe('toTrack', () => {
  it('maps a catalogue row to a native track', () => {
    expect(toTrack(song)).toEqual({
      id: 'song-1',
      url: 'https://res.cloudinary.com/demo/video/upload/vybe/audio/demo.mp3',
      title: 'Midnight Drive',
      artist: 'VYBE Collective',
      album: 'Night Signals',
      artwork: 'https://res.cloudinary.com/demo/image/upload/vybe/artwork/demo.jpg',
      duration: 215,
      genre: 'Electronic',
    });
  });

  it('falls back when relations are missing', () => {
    const track = toTrack({ ...song, artist: null, album: null, cover_url: null } as never);
    expect(track.artist).toBe('Unknown artist');
    expect(track.album).toBeUndefined();
    expect(track.artwork).toBeUndefined();
  });

  it('refuses to build a track without audio', () => {
    expect(() => toTrack({ ...song, audio_url: '' } as never)).toThrow(/playable audio URL/);
  });
});
