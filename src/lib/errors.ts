import type { AuthError, PostgrestError } from '@supabase/supabase-js';

type ErrorLike = {
  message?: unknown;
  error_description?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  context?: unknown;
};

export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.toLowerCase().includes('aborted');
  }
  const message = typeof error === 'object' ? (error as ErrorLike).message : undefined;
  return typeof message === 'string' && message.toLowerCase().includes('aborted');
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    return error || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  const candidate = error as ErrorLike;
  const message = candidate.message ?? candidate.error_description;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (typeof candidate.details === 'string' && candidate.details.trim()) {
    return candidate.details;
  }

  return fallback;
}

export async function getFunctionErrorMessage(
  error: unknown,
  fallback = 'The server could not complete this request.',
): Promise<string> {
  const context = (error as ErrorLike | null)?.context;
  if (context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as { error?: unknown; message?: unknown };
      const message = payload.error ?? payload.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    } catch {
      // Fall through to the generic message.
    }
  }
  return getErrorMessage(error, fallback);
}

export function friendlyAuthError(error: AuthError | null, fallback: string): string {
  if (!error) return fallback;
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'That email and password combination is incorrect.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('user already registered')) {
    return 'An account already exists for this email.';
  }
  if (message.includes('password should be at least')) {
    return 'Use a password with at least 8 characters.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return getErrorMessage(error, fallback);
}

export function describeDatabaseError(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === '42501' || error.message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to do that.';
  }
  if (error.code === '23505') {
    return 'That item already exists.';
  }
  if (error.code === '23503') {
    return 'A linked item could not be found. It may have been deleted.';
  }
  return error.message || fallback;
}

export function logError(scope: string, error: unknown): void {
  if (__DEV__) {
    // Errors are surfaced to the UI; this keeps diagnostics available in Metro.
    console.warn(`[${scope}]`, error);
  }
}
