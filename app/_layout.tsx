import { Ionicons } from '@expo/vector-icons';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ToastHost } from '@/components/ui/ToastHost';
import { TrackActionsHost } from '@/features/catalogue/components/TrackActionsHost';
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { env } from '@/lib/env';
import { refreshCatalogue } from '@/stores/catalogueStore';
import { useAuthStore } from '@/stores/authStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { colors, radii, spacing } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const detailSegments = new Set(['album', 'playlist', 'artist']);

function PlayerDock() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const shouldShow = detailSegments.has(segments[0] ?? '');

  if (!shouldShow) return null;

  return (
    <View style={[styles.dock, { bottom: insets.bottom + 8 }]}>
      <MiniPlayer />
    </View>
  );
}

function ConfigurationRequired() {
  return (
    <View style={styles.configRoot}>
      <View style={styles.logo}>
        <Ionicons name="musical-notes" size={26} color={colors.violet} />
      </View>
      <AppText variant="h1" style={styles.configTitle}>
        VYBE needs a backend
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.configCopy}>
        Add your Supabase project credentials to a <AppText variant="bodyBold">.env</AppText> file,
        then rebuild the Android development app.
      </AppText>
      <View style={styles.configCard}>
        <AppText variant="label" color={colors.violet}>
          Required variables
        </AppText>
        <AppText variant="small">EXPO_PUBLIC_SUPABASE_URL</AppText>
        <AppText variant="small">EXPO_PUBLIC_SUPABASE_ANON_KEY</AppText>
      </View>
      <AppText variant="caption" color={colors.textTertiary} style={styles.configHint}>
        Copy .env.example to .env, fill in the values from your Supabase dashboard, then run
        npx expo run:android. Environment values are compiled into the app, so a Metro reload alone
        is not enough.
      </AppText>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const authInitialized = useAuthStore((state) => state.initialized);
  const authStatus = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.session?.user.id);
  const previousStatus = useRef(authStatus);

  useEffect(() => {
    void (async () => {
      await usePreferencesStore.persist.rehydrate().catch(() => undefined);
      await useAuthStore.getState().initialize();
    })();
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      void usePlayerStore.getState().initialize();
      void useLibraryStore.getState().load();
    }
  }, [authStatus, userId]);

  useEffect(() => {
    if (previousStatus.current === 'authenticated' && authStatus === 'unauthenticated') {
      useLibraryStore.getState().reset();
      void usePlayerStore.getState().reset();
    }
    previousStatus.current = authStatus;
  }, [authStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (useAuthStore.getState().status === 'authenticated') {
          refreshCatalogue();
          void useAuthStore.getState().refreshProfile();
        }
        return;
      }

      if (state === 'background') {
        void usePlayerStore.getState().saveSession();
        if (!usePreferencesStore.getState().backgroundPlayback) {
          void usePlayerStore.getState().pausePlayback();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && authInitialized) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [authInitialized, fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!env.hasSupabaseConfig) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <ConfigurationRequired />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth-callback" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="player"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="queue"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="album/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="artist/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="playlist/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="+not-found" options={{ animation: 'fade' }} />
        </Stack>
        <PlayerDock />
        <TrackActionsHost />
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dock: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  configRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.35)',
    marginBottom: spacing.sm,
  },
  configTitle: {
    textAlign: 'center',
  },
  configCopy: {
    textAlign: 'center',
    maxWidth: 340,
  },
  configCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  configHint: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 360,
    marginTop: spacing.sm,
  },
});
