import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProgress } from 'react-native-track-player';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDuration } from '@/lib/format';
import { usePlayerStore } from '@/stores/playerStore';
import { colors, radii, spacing } from '@/theme';

export function ContinueListeningCard() {
  const router = useRouter();
  const queue = usePlayerStore((state) => state.queue);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const track = queue[activeIndex];
  const progress = useProgress(500);

  if (!track) return null;

  const duration = progress.duration > 0 ? progress.duration : (track.duration_seconds ?? 0);
  const fraction = duration > 0 ? Math.min(1, progress.position / duration) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - progress.position) : null;

  return (
    <View style={styles.section}>
      <AppText variant="label" color={colors.violet} style={styles.eyebrow}>
        Continue listening
      </AppText>
      <Pressable
        onPress={() => router.push('/player')}
        accessibilityRole="button"
        accessibilityLabel={`Continue listening to ${track.title}`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <CoverArt url={track.cover_url} seed={track.id} size={68} radius={14} />
        <View style={styles.copy}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {track.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
            {track.artist?.name ?? 'Unknown artist'}
            {remaining != null ? ` · ${formatDuration(remaining)} left` : ''}
          </AppText>
          <View style={styles.progressRow}>
            <ProgressBar progress={fraction} height={3} />
          </View>
        </View>
        <Pressable
          onPress={() => void togglePlay()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Resume'}
          style={({ pressed }) => [styles.play, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={colors.white} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    marginLeft: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  progressRow: {
    marginTop: spacing.xs,
  },
  play: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
