export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '--:--';
  }
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatTotalDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0 min';
  }
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return '0';
  }
  if (value < 1_000) {
    return String(Math.round(value));
  }
  if (value < 1_000_000) {
    const scaled = value / 1_000;
    return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const scaled = value / 1_000_000;
  return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}M`;
}

export function formatRelativeTime(isoDate: string | null | undefined, now = Date.now()): string {
  if (!isoDate) {
    return '';
  }
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) {
    return '';
  }
  const diff = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'Just now';
  }
  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}m ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  }
  if (diff < 2 * day) {
    return 'Yesterday';
  }
  if (diff < 7 * day) {
    const days = Math.floor(diff / day);
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(timestamp).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  });
}

export function getInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return 'V';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatPublishedDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return 'Unpublished';
  }
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) {
    return 'Unpublished';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
