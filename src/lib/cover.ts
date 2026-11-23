import { coverGradients } from '@/theme';

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCoverGradient(seed: string | null | undefined): readonly [string, string, string] {
  const palette = coverGradients[hashString(seed || 'vybe') % coverGradients.length];
  return palette ?? coverGradients[0]!;
}

export const FALLBACK_ARTWORK = require('../../assets/images/artwork-fallback.png');

export function artworkSource(url: string | null | undefined) {
  return url ? { uri: url } : FALLBACK_ARTWORK;
}
