export const APP_NAME = 'VYBE';
export const APP_TAGLINE = 'Feel the music';

export const PAGE_SIZE = 24;
export const SEARCH_PAGE_SIZE = 20;
export const HOME_SECTION_LIMIT = 12;
export const MAX_QUEUE_LENGTH = 500;

export const GENRES = [
  'Tamil',
  'Pop',
  'Hip-Hop',
  'R&B',
  'Indie',
  'Electronic',
  'Classical',
  'Devotional',
  'Folk',
  'Other',
] as const;

export type Genre = (typeof GENRES)[number];

export const LANGUAGES = [
  'Tamil',
  'English',
  'Hindi',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Other',
] as const;

export type Language = (typeof LANGUAGES)[number];

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus'] as const;
export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
  'audio/opus',
] as const;

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export const STORAGE_KEYS = {
  playerSession: 'vybe.player.session.v1',
  preferences: 'vybe.preferences.v1',
  recentSearches: 'vybe.search.recent.v1',
} as const;

export const CLOUDINARY_AUDIO_FOLDER = 'vybe/audio';
export const CLOUDINARY_ARTWORK_FOLDER = 'vybe/artwork';

export const TAB_BAR_BASE_HEIGHT = 62;
export const MINI_PLAYER_HEIGHT = 64;
