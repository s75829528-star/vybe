import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

type Stage = 'form' | 'confirm-email';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signUp = useAuthStore((state) => state.signUp);

  const [stage, setStage] = useState<Stage>('form');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    const name = displayName.trim();
    const trimmedEmail = email.trim();

    if (name.length < 2) {
      setError('Enter your name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp(trimmedEmail, password, name);
      if (result.needsEmailConfirmation) {
        setStage('confirm-email');
        return;
      }
      router.replace('/(tabs)');
    } catch (signUpError) {
      setError(getErrorMessage(signUpError, 'Account creation failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === 'confirm-email') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={gradients.primarySoft} style={styles.glow} />
        <View
          style={[
            styles.confirmWrap,
            { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <View style={styles.confirmIcon}>
            <Ionicons name="mail-unread-outline" size={30} color={colors.violet} />
          </View>
          <AppText variant="h1" style={styles.center}>
            Check your inbox
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.confirmCopy}>
            We sent a confirmation link to {email.trim()}. Open it on this device to finish creating
            your VYBE account, then sign in.
          </AppText>
          <Button
            label="Go to sign in"
            fullWidth
            size="lg"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </View>
      </View>
    );
  }

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
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.heading}>
            <AppText variant="label" color={colors.violet}>
              Join VYBE
            </AppText>
            <AppText variant="display" style={styles.title}>
              Your sound,{'\n'}your library.
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Create an account to like songs, build playlists and sync your listening across
              devices.
            </AppText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Display name"
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                if (error) setError(null);
              }}
              placeholder="How should we call you?"
              icon="person-outline"
              autoCapitalize="words"
              textContentType="name"
              returnKeyType="next"
            />
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
              placeholder="At least 8 characters"
              icon="lock-closed-outline"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              hint="Use 8 or more characters."
            />
            <TextField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (error) setError(null);
              }}
              placeholder="Repeat your password"
              icon="shield-checkmark-outline"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
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
              label={submitting ? 'Creating account…' : 'Create account'}
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={submitting}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <AppText variant="small" color={colors.textSecondary}>
              Already have an account?
            </AppText>
            <Pressable
              onPress={() => router.replace('/(auth)/sign-in')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <AppText variant="smallBold" color={colors.violet}>
                Sign in
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
    top: -160,
    left: -90,
    right: -90,
    height: 420,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    gap: spacing.xxl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    letterSpacing: -1.4,
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
  confirmWrap: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  confirmIcon: {
    width: 66,
    height: 66,
    borderRadius: radii.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.3)',
  },
  confirmCopy: {
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
