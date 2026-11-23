import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { HttpError } from './http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function assertConfigured(): void {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new HttpError(500, 'The function is not configured with Supabase credentials.');
  }
}

/** Service-role client. Never return this client or its key to the app. */
export function adminClient(): SupabaseClient {
  assertConfigured();
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Validates the caller's access token and requires the `admin` profile role.
 * The user-scoped client respects RLS, so the check cannot be bypassed by a
 * forged role in the request body.
 */
export async function requireAdmin(request: Request): Promise<{ userId: string }> {
  assertConfigured();

  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'A valid session is required.');
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, 'Your session is invalid or has expired.');
  }

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    throw new HttpError(403, 'Administrator access is required.');
  }

  return { userId: data.user.id };
}
