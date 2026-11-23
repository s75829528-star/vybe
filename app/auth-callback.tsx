import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';
import { colors, radii, spacing } from '@/theme';

function parseAuthParams(url: string): {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
} {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const raw =
    hashIndex >= 0
      ? url.slice(hashIndex + 1)
      : queryIndex >= 0
        ? url.slice(queryIndex + 1)
        : '';
  const params = new URLSearchParams(raw);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    error: params.get('error_description') ?? params.get('error'),
  };
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const setSessionFromTokens = useAuthStore((state) => state.setSessionFromTokens);
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;

    const complete = async (link: string | null) => {
      if (!link) return;
      handled.current = true;
      const params = parseAuthParams(link);

      if (params.error) {
        setError(params.error);
        return;
      }
      if (!params.accessToken || !params.refreshToken) {
        setError('This confirmation link is missing its sign-in details. Request a new email.');
        return;
      }

      try {
        await setSessionFromTokens(params.accessToken, params.refreshToken);
        router.replace('/(tabs)');
      } catch (callbackError) {
        setError(getErrorMessage(callbackError, 'This confirmation link could not be used.'));
      }
    };

    void (async () => {
      if (url) {
        await complete(url);
        return;
      }
      const initial = await Linking.getInitialURL();
      if (initial) {
        await complete(initial);
        return;
      }
      // Give the URL event a moment before declaring the link invalid.
      setTimeout(() => {
        if (!handled.current) {
          setError('Open the confirmation link from your email on this device.');
        }
      }, 1200);
    })();
  }, [router, setSessionFromTokens, url]);

  return (
    <Screen>
      <View style={styles.container}>
        {error ? (
          <>
            <View style={[styles.icon, styles.iconError]}>
              <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
            </View>
            <AppText variant="h2" style={styles.center}>
              Link not valid
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.copy}>
              {error}
            </AppText>
            <Button
              label="Back to sign in"
              onPress={() => router.replace('/(auth)/sign-in')}
              variant="secondary"
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.violet} size="large" />
            <AppText variant="h3" style={styles.center}>
              Signing you in…
            </AppText>
            <AppText variant="small" color={colors.textSecondary} style={styles.copy}>
              Verifying your confirmation link.
            </AppText>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  icon: {
    width: 66,
    height: 66,
    borderRadius: radii.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconError: {
    backgroundColor: colors.dangerSoft,
  },
  center: {
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
});
