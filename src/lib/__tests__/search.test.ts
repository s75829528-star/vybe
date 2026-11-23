import { buildLikePattern, hasSearchTerm, sanitizeSearchTerm } from '@/lib/search';

describe('sanitizeSearchTerm', () => {
  it('strips PostgREST filter operators', () => {
    expect(sanitizeSearchTerm('hello, world')).toBe('hello world');
    expect(sanitizeSearchTerm('50% off')).toBe('50 off');
    expect(sanitizeSearchTerm('a_b(c)d')).toBe('a b d');
    expect(sanitizeSearchTerm('title.eq."x"')).toBe('title eq x');
    expect(sanitizeSearchTerm('star*|bang!')).toBe('star bang');
  });

  it('collapses whitespace and control characters', () => {
    expect(sanitizeSearchTerm('  a \n\t b  ')).toBe('a b');
    expect(sanitizeSearchTerm('a\u0000b\u007Fc')).toBe('a b c');
  });

  it('limits long input', () => {
    expect(sanitizeSearchTerm('a'.repeat(200))).toHaveLength(80);
  });

  it('returns an empty string for operator-only input', () => {
    expect(sanitizeSearchTerm('%_,()"')).toBe('');
  });
});

describe('buildLikePattern', () => {
  it('wraps the sanitized term in wildcards', () => {
    expect(buildLikePattern('Anirudh')).toBe('%Anirudh%');
    expect(buildLikePattern('  a%b  ')).toBe('%a b%');
  });
});

describe('hasSearchTerm', () => {
  it('detects meaningful search input', () => {
    expect(hasSearchTerm('')).toBe(false);
    expect(hasSearchTerm('   ')).toBe(false);
    expect(hasSearchTerm('%%')).toBe(false);
    expect(hasSearchTerm('vibe')).toBe(true);
  });
});
