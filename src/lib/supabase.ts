import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { env } from './env';

const FALLBACK_URL = 'https://not-configured.supabase.co';
const FALLBACK_KEY = 'not-configured';

export const supabase = createClient<Database>(
  env.supabaseUrl || FALLBACK_URL,
  env.supabaseAnonKey || FALLBACK_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'vybe-android/1.0.0',
      },
    },
  },
);

// Supabase recommends pausing token refresh while the app is backgrounded.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
