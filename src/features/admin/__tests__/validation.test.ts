import {
  fileExtension,
  hasErrors,
  validateAudioFile,
  validateImageFile,
  validateSongMetadata,
} from '@/features/admin/validation';
import { MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '@/lib/constants';

describe('fileExtension', () => {
  it('extracts a lowercase extension', () => {
    expect(fileExtension('Track.MP3')).toBe('mp3');
    expect(fileExtension('cover.final.PNG')).toBe('png');
    expect(fileExtension('no-extension')).toBe('');
    expect(fileExtension('trailing.')).toBe('');
  });
});

describe('validateAudioFile', () => {
  it('accepts supported audio', () => {
    expect(
      validateAudioFile({ name: 'song.mp3', mimeType: 'audio/mpeg', size: 1024 }),
    ).toBeNull();
    expect(validateAudioFile({ name: 'song.FLAC', size: 1024 })).toBeNull();
  });

  it('rejects unsupported formats', () => {
    expect(validateAudioFile({ name: 'song.txt', size: 1024 })).toMatch(/Unsupported audio format/);
    expect(validateAudioFile({ name: 'song.mp3', mimeType: 'video/mp4', size: 1024 })).toMatch(
      /does not look like an audio file/,
    );
  });

  it('rejects empty and oversized files', () => {
    expect(validateAudioFile({ name: 'song.mp3', size: 0 })).toMatch(/empty/);
    expect(validateAudioFile({ name: 'song.mp3', size: MAX_AUDIO_BYTES + 1 })).toMatch(
      /smaller than/,
    );
  });

  it('allows unknown size to be resolved after upload starts', () => {
    expect(validateAudioFile({ name: 'song.mp3' })).toBeNull();
  });
});

describe('validateImageFile', () => {
  it('accepts supported artwork', () => {
    expect(validateImageFile({ name: 'cover.jpg', mimeType: 'image/jpeg', size: 2048 })).toBeNull();
    expect(validateImageFile({ name: 'cover.webp', size: 2048 })).toBeNull();
  });

  it('rejects unsupported or oversized artwork', () => {
    expect(validateImageFile({ name: 'cover.gif' })).toMatch(/Unsupported artwork format/);
    expect(validateImageFile({ name: 'cover.jpg', mimeType: 'application/pdf' })).toMatch(
      /does not look like an image/,
    );
    expect(validateImageFile({ name: 'cover.jpg', size: MAX_IMAGE_BYTES + 1 })).toMatch(
      /smaller than/,
    );
  });
});

describe('validateSongMetadata', () => {
  const valid = {
    title: 'Midnight Drive',
    artistName: 'VYBE Collective',
    albumTitle: 'Night Signals',
    genre: 'Electronic',
    language: 'English',
    trackNumber: '2',
    publishNow: true,
  };

  it('accepts complete metadata', () => {
    expect(hasErrors(validateSongMetadata(valid))).toBe(false);
  });

  it('requires a title, artist, genre and language', () => {
    const errors = validateSongMetadata({
      ...valid,
      title: '  ',
      artistName: '',
      genre: '',
      language: '',
    });
    expect(errors.title).toBeDefined();
    expect(errors.artistName).toBeDefined();
    expect(errors.genre).toBeDefined();
    expect(errors.language).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it('validates length limits', () => {
    const errors = validateSongMetadata({
      ...valid,
      title: 'x'.repeat(201),
      artistName: 'y'.repeat(161),
      albumTitle: 'z'.repeat(201),
    });
    expect(errors.title).toMatch(/200/);
    expect(errors.artistName).toMatch(/160/);
    expect(errors.albumTitle).toMatch(/200/);
  });

  it('validates optional track numbers', () => {
    expect(validateSongMetadata({ ...valid, trackNumber: '' }).trackNumber).toBeUndefined();
    expect(validateSongMetadata({ ...valid, trackNumber: '0' }).trackNumber).toBeDefined();
    expect(validateSongMetadata({ ...valid, trackNumber: '1000' }).trackNumber).toBeDefined();
    expect(validateSongMetadata({ ...valid, trackNumber: '2.5' }).trackNumber).toBeDefined();
    expect(validateSongMetadata({ ...valid, trackNumber: '999' }).trackNumber).toBeUndefined();
  });
});
