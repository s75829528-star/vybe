import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';
import { colors, gradients, radii, spacing } from '@/theme';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((state) => state.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Enter your password.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
      router.replace('/(tabs)');
    } catch (signInError) {
      setError(getErrorMessage(signInError, 'Sign in failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.primarySoft} style={styles.glow} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              accessibilityLabel="VYBE logo"
            />
            <AppText variant="label" color={colors.violet}>
              Feel the music
            </AppText>
          </View>

          <View style={styles.heading}>
            <AppText variant="display">Welcome back.</AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Sign in to pick up your queue, liked songs and playlists right where you left off.
            </AppText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              icon="mail-outline"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError(null);
              }}
              placeholder="Your password"
              icon="lock-closed-outline"
              secure
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void handleSubmit()}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color={colors.danger} />
                <AppText variant="small" color={colors.danger} style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <Button
              label={submitting ? 'Signing in…' : 'Sign in'}
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={submitting}
              fullWidth
              size="lg"
              icon="arrow-forward"
              iconPosition="right"
            />
          </View>

          <View style={styles.footer}>
            <AppText variant="small" color={colors.textSecondary}>
              New to VYBE?
            </AppText>
            <Pressable
              onPress={() => router.push('/(auth)/sign-up')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
            >
              <AppText variant="smallBold" color={colors.violet}>
                Create an account
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: -140,
    left: -80,
    right: -80,
    height: 420,
    opacity: 0.9,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xxxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.35)',
  },
  heading: {
    gap: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
    maxWidth: 380,
  },
  form: {
    gap: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
