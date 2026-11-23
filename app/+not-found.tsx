import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/theme';

export default function NotFound() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.icon}>
          <Ionicons name="compass-outline" size={30} color={colors.violet} />
        </View>
        <AppText variant="h1" style={styles.title}>
          Off the track
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.copy}>
          This screen does not exist. Let&apos;s get you back to the music.
        </AppText>
        <Button label="Back to home" icon="home" onPress={() => router.replace('/(tabs)')} />
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
    width: 68,
    height: 68,
    borderRadius: radii.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.3)',
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.sm,
  },
});
