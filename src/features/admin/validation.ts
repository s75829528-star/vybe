import {
  AUDIO_EXTENSIONS,
  AUDIO_MIME_TYPES,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
} from '@/lib/constants';
import { formatFileSize } from '@/lib/format';

export type UploadCandidate = {
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

export function fileExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}

export function validateAudioFile(file: UploadCandidate): string | null {
  const extension = fileExtension(file.name);
  const isAllowedExtension = (AUDIO_EXTENSIONS as readonly string[]).includes(extension);
  const mime = (file.mimeType ?? '').toLowerCase();
  const isAllowedMime =
    mime.length === 0 ||
    mime.startsWith('audio/') ||
    (AUDIO_MIME_TYPES as readonly string[]).includes(mime);

  if (!isAllowedExtension) {
    return `Unsupported audio format. Use ${AUDIO_EXTENSIONS.join(', ').toUpperCase()}.`;
  }
  if (!isAllowedMime) {
    return 'That file does not look like an audio file.';
  }
  if (typeof file.size === 'number' && file.size <= 0) {
    return 'The selected audio file is empty.';
  }
  if (typeof file.size === 'number' && file.size > MAX_AUDIO_BYTES) {
    return `Audio files must be smaller than ${formatFileSize(MAX_AUDIO_BYTES)}.`;
  }
  return null;
}

export function validateImageFile(file: UploadCandidate): string | null {
  const extension = fileExtension(file.name);
  const isAllowedExtension = (IMAGE_EXTENSIONS as readonly string[]).includes(extension);
  const mime = (file.mimeType ?? '').toLowerCase();
  const isAllowedMime =
    mime.length === 0 || (IMAGE_MIME_TYPES as readonly string[]).includes(mime);

  if (!isAllowedExtension) {
    return `Unsupported artwork format. Use ${IMAGE_EXTENSIONS.join(', ').toUpperCase()}.`;
  }
  if (!isAllowedMime) {
    return 'That file does not look like an image.';
  }
  if (typeof file.size === 'number' && file.size <= 0) {
    return 'The selected artwork file is empty.';
  }
  if (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES) {
    return `Artwork must be smaller than ${formatFileSize(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}

export type SongMetadataInput = {
  title: string;
  artistName: string;
  albumTitle: string;
  genre: string;
  language: string;
  trackNumber: string;
  publishNow: boolean;
};

export type SongMetadataErrors = Partial<Record<keyof SongMetadataInput, string>>;

export function validateSongMetadata(input: SongMetadataInput): SongMetadataErrors {
  const errors: SongMetadataErrors = {};
  const title = input.title.trim();
  const artist = input.artistName.trim();

  if (!title) {
    errors.title = 'Enter a song title.';
  } else if (title.length > 200) {
    errors.title = 'Song titles must be 200 characters or fewer.';
  }

  if (!artist) {
    errors.artistName = 'Enter or select an artist.';
  } else if (artist.length > 160) {
    errors.artistName = 'Artist names must be 160 characters or fewer.';
  }

  if (input.albumTitle.trim().length > 200) {
    errors.albumTitle = 'Album titles must be 200 characters or fewer.';
  }

  if (!input.genre.trim()) {
    errors.genre = 'Choose a genre.';
  }

  if (!input.language.trim()) {
    errors.language = 'Choose a language.';
  }

  if (input.trackNumber.trim()) {
    const number = Number(input.trackNumber);
    if (!Number.isInteger(number) || number < 1 || number > 999) {
      errors.trackNumber = 'Track number must be between 1 and 999.';
    }
  }

  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
