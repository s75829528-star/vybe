const POSTGREST_SPECIAL_CHARACTERS = /[%_,."'\\:*!<>|]/g;

export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(POSTGREST_SPECIAL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function buildLikePattern(input: string): string {
  const term = sanitizeSearchTerm(input);
  return `%${term}%`;
}

export function hasSearchTerm(input: string): boolean {
  return sanitizeSearchTerm(input).length > 0;
}
