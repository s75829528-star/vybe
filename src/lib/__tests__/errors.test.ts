import { describeDatabaseError, friendlyAuthError, getErrorMessage } from '@/lib/errors';
import type { AuthError, PostgrestError } from '@supabase/supabase-js';

function postgrest(partial: Partial<PostgrestError>): PostgrestError {
  return {
    message: '',
    details: '',
    hint: '',
    code: '',
    ...partial,
  } as PostgrestError;
}

describe('getErrorMessage', () => {
  it('prefers a real message', () => {
    expect(getErrorMessage(new Error('Network unavailable'))).toBe('Network unavailable');
    expect(getErrorMessage({ message: 'Row not found' })).toBe('Row not found');
    expect(getErrorMessage('Plain failure')).toBe('Plain failure');
  });

  it('falls back when nothing usable is present', () => {
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(getErrorMessage({}, 'Fallback')).toBe('Fallback');
    expect(getErrorMessage('', 'Fallback')).toBe('Fallback');
  });
});

describe('friendlyAuthError', () => {
  const authError = (message: string) => ({ message }) as AuthError;

  it('translates common Supabase auth failures', () => {
    expect(friendlyAuthError(authError('Invalid login credentials'), 'fallback')).toBe(
      'That email and password combination is incorrect.',
    );
    expect(friendlyAuthError(authError('Email not confirmed'), 'fallback')).toBe(
      'Please confirm your email address before signing in.',
    );
    expect(friendlyAuthError(authError('User already registered'), 'fallback')).toBe(
      'An account already exists for this email.',
    );
    expect(friendlyAuthError(authError('Password should be at least 6 characters'), 'fallback')).toBe(
      'Use a password with at least 8 characters.',
    );
  });

  it('passes through unknown messages', () => {
    expect(friendlyAuthError(authError('Something odd'), 'fallback')).toBe('Something odd');
    expect(friendlyAuthError(null, 'fallback')).toBe('fallback');
  });
});

describe('describeDatabaseError', () => {
  it('explains permission and constraint failures', () => {
    expect(describeDatabaseError(postgrest({ code: '42501' }), 'fallback')).toBe(
      'You do not have permission to do that.',
    );
    expect(describeDatabaseError(postgrest({ code: '23505' }), 'fallback')).toBe(
      'That item already exists.',
    );
    expect(describeDatabaseError(postgrest({ code: '23503' }), 'fallback')).toBe(
      'A linked item could not be found. It may have been deleted.',
    );
  });

  it('uses the database message otherwise', () => {
    expect(describeDatabaseError(postgrest({ code: 'XX000', message: 'boom' }), 'fallback')).toBe(
      'boom',
    );
    expect(describeDatabaseError(null, 'fallback')).toBe('fallback');
  });
});
