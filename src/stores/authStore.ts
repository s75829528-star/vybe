import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';

import { env } from '@/lib/env';
import { friendlyAuthError, logError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

type AuthStatus = 'idle' | 'initializing' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  initialized: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearError: () => void;
};

let authSubscriptionStarted = false;
let profileRequestId = 0;

function displayNameFromUser(user: User): string {
  const metadataName = user.user_metadata?.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }
  const email = user.email ?? '';
  return email.split('@')[0] || 'Listener';
}

async function fetchProfile(user: User): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (data) {
    return data;
  }

  // The database trigger creates profiles on sign-up. This fallback keeps the
  // app usable if a project was created before the migration was applied.
  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: displayNameFromUser(user),
      role: 'listener',
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (upsertError) {
    throw upsertError;
  }

  const { data: created, error: createdError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (createdError || !created) {
    throw createdError ?? new Error('Your profile could not be loaded.');
  }
  return created;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'idle',
  initialized: false,
  session: null,
  profile: null,
  isAdmin: false,
  error: null,

  initialize: async () => {
    if (get().initialized) return;

    if (!env.hasSupabaseConfig) {
      set({ initialized: true, status: 'unauthenticated', error: null });
      return;
    }

    set({ status: 'initializing' });

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      if (!session) {
        set({
          initialized: true,
          status: 'unauthenticated',
          session: null,
          profile: null,
          isAdmin: false,
        });
      } else {
        set({ session });
        try {
          const profile = await fetchProfile(session.user);
          set({
            initialized: true,
            status: 'authenticated',
            profile,
            isAdmin: profile.role === 'admin',
            error: null,
          });
        } catch (profileError) {
          logError('auth/profile', profileError);
          set({
            initialized: true,
            status: 'authenticated',
            profile: null,
            isAdmin: false,
          });
        }
      }
    } catch (error) {
      logError('auth/initialize', error);
      set({
        initialized: true,
        status: 'unauthenticated',
        session: null,
        profile: null,
        isAdmin: false,
      });
    }

    if (!authSubscriptionStarted) {
      authSubscriptionStarted = true;
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          set({
            session: null,
            profile: null,
            isAdmin: false,
            status: 'unauthenticated',
            initialized: true,
          });
          return;
        }

        set({ session });
        const requestId = ++profileRequestId;

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          // Supabase warns against awaiting other Supabase calls inside this
          // callback, so profile loading is deferred to the next tick.
          setTimeout(() => {
            void (async () => {
              try {
                const profile = await fetchProfile(session.user);
                if (requestId !== profileRequestId) return;
                set({
                  status: 'authenticated',
                  profile,
                  isAdmin: profile.role === 'admin',
                  error: null,
                });
              } catch (error) {
                if (requestId !== profileRequestId) return;
                logError('auth/stateChange', error);
                set({ status: 'authenticated', profile: null, isAdmin: false });
              }
            })();
          }, 0);
        }
      });
    }
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const message = friendlyAuthError(error, 'Sign in failed.');
      set({ error: message });
      throw new Error(message);
    }
    if (!data.session) {
      const message = 'Sign in did not return a session. Please try again.';
      set({ error: message });
      throw new Error(message);
    }
    const profile = await fetchProfile(data.session.user);
    set({
      session: data.session,
      profile,
      isAdmin: profile.role === 'admin',
      status: 'authenticated',
      initialized: true,
      error: null,
    });
  },

  signUp: async (email, password, displayName) => {
    set({ error: null });
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      const message = friendlyAuthError(error, 'Account creation failed.');
      set({ error: message });
      throw new Error(message);
    }

    if (!data.session) {
      return { needsEmailConfirmation: true };
    }

    let profile: Profile | null = null;
    try {
      profile = await fetchProfile(data.session.user);
    } catch (profileError) {
      logError('auth/signUpProfile', profileError);
    }

    set({
      session: data.session,
      profile,
      isAdmin: profile?.role === 'admin',
      status: 'authenticated',
      initialized: true,
      error: null,
    });
    return { needsEmailConfirmation: false };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('auth/signOut', error);
    }
    set({
      session: null,
      profile: null,
      isAdmin: false,
      status: 'unauthenticated',
      error: null,
    });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    try {
      const profile = await fetchProfile(session.user);
      set({ profile, isAdmin: profile.role === 'admin' });
    } catch (error) {
      logError('auth/refreshProfile', error);
    }
  },

  updateDisplayName: async (displayName) => {
    const session = get().session;
    const trimmed = displayName.trim();
    if (!session) throw new Error('You need to be signed in.');
    if (trimmed.length < 2) throw new Error('Display name must be at least 2 characters.');

    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', session.user.id)
      .select('*')
      .single();

    if (error) throw error;
    set({ profile: data, isAdmin: data.role === 'admin' });
  },

  setSessionFromTokens: async (accessToken, refreshToken) => {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    if (!data.session) throw new Error('The sign-in link is invalid or has expired.');

    let profile: Profile | null = null;
    try {
      profile = await fetchProfile(data.session.user);
    } catch (profileError) {
      logError('auth/callbackProfile', profileError);
    }
    set({
      session: data.session,
      profile,
      isAdmin: profile?.role === 'admin',
      status: 'authenticated',
      initialized: true,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
