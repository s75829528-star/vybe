import {
  formatCompactNumber,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  formatTotalDuration,
  getGreeting,
  getInitials,
  pluralize,
} from '@/lib/format';

describe('formatDuration', () => {
  it('formats minutes and seconds with zero padding', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(215)).toBe('3:35');
  });

  it('formats hour-long durations', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(7325)).toBe('2:02:05');
  });

  it('handles missing and invalid input', () => {
    expect(formatDuration(null)).toBe('--:--');
    expect(formatDuration(undefined)).toBe('--:--');
    expect(formatDuration(Number.NaN)).toBe('--:--');
    expect(formatDuration(-4)).toBe('--:--');
  });
});

describe('formatTotalDuration', () => {
  it('summarises the running time of a collection', () => {
    expect(formatTotalDuration(0)).toBe('0 min');
    expect(formatTotalDuration(1)).toBe('0 min');
    expect(formatTotalDuration(90)).toBe('2 min');
    expect(formatTotalDuration(3600)).toBe('1 hr');
    expect(formatTotalDuration(5400)).toBe('1 hr 30 min');
  });
});

describe('formatCompactNumber', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(999)).toBe('999');
    expect(formatCompactNumber(1_000)).toBe('1K');
    expect(formatCompactNumber(1_250)).toBe('1.3K');
    expect(formatCompactNumber(120_000)).toBe('120K');
    expect(formatCompactNumber(2_000_000)).toBe('2M');
    expect(formatCompactNumber(2_450_000)).toBe('2.5M');
  });

  it('never renders negative or invalid counts', () => {
    expect(formatCompactNumber(-10)).toBe('0');
    expect(formatCompactNumber(Number.NaN)).toBe('0');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-06-15T12:00:00.000Z').getTime();

  it('returns a friendly relative label', () => {
    expect(formatRelativeTime(new Date(now - 30_000).toISOString(), now)).toBe('Just now');
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5m ago');
    expect(formatRelativeTime(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe('3h ago');
    expect(formatRelativeTime(new Date(now - 25 * 3_600_000).toISOString(), now)).toBe('Yesterday');
    expect(formatRelativeTime(new Date(now - 4 * 86_400_000).toISOString(), now)).toBe('4d ago');
  });

  it('handles empty and invalid dates', () => {
    expect(formatRelativeTime(null, now)).toBe('');
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});

describe('formatFileSize', () => {
  it('formats byte sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2_048)).toBe('2.0 KB');
    expect(formatFileSize(50 * 1024 * 1024)).toBe('50 MB');
  });
});

describe('getInitials', () => {
  it('takes the first and last initial', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('  single  ')).toBe('SI');
    expect(getInitials('')).toBe('V');
    expect(getInitials(null)).toBe('V');
  });
});

describe('getGreeting', () => {
  it('changes with the time of day', () => {
    expect(getGreeting(new Date('2026-06-15T02:00:00'))).toBe('Still up?');
    expect(getGreeting(new Date('2026-06-15T08:00:00'))).toBe('Good morning');
    expect(getGreeting(new Date('2026-06-15T14:00:00'))).toBe('Good afternoon');
    expect(getGreeting(new Date('2026-06-15T19:00:00'))).toBe('Good evening');
    expect(getGreeting(new Date('2026-06-15T23:00:00'))).toBe('Good night');
  });
});

describe('pluralize', () => {
  it('uses the singular for one item', () => {
    expect(pluralize(1, 'song')).toBe('1 song');
    expect(pluralize(0, 'song')).toBe('0 songs');
    expect(pluralize(3, 'artist')).toBe('3 artists');
  });
});
