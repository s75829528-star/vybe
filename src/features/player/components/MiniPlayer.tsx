import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProgress } from 'react-native-track-player';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePlayerStore } from '@/stores/playerStore';
import { colors, spacing } from '@/theme';

export function MiniPlayer() {
  const router = useRouter();
  const queue = usePlayerStore((state) => state.queue);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const next = usePlayerStore((state) => state.next);

  const track = queue[activeIndex];
  const progress = useProgress(500);

  if (!track) return null;

  const duration = progress.duration > 0 ? progress.duration : (track.duration_seconds ?? 0);
  const fraction = duration > 0 ? progress.position / duration : 0;

  return (
    <View style={styles.container}>
      <ProgressBar progress={fraction} height={2} trackColor="rgba(255,255,255,0.06)" />
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push('/player')}
          accessibilityRole="button"
          accessibilityLabel={`Now playing ${track.title}. Open player.`}
          style={({ pressed }) => [styles.info, pressed && { opacity: 0.75 }]}
        >
          <CoverArt url={track.cover_url} seed={track.id} size={44} radius={10} />
          <View style={styles.copy}>
            <AppText variant="smallBold" numberOfLines={1}>
              {track.title}
            </AppText>
            <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
              {track.artist?.name ?? 'Unknown artist'}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          onPress={() => void togglePlay()}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={({ pressed }) => [styles.control, pressed && { opacity: 0.6 }]}
        >
          {isBuffering ? (
            <Ionicons name="ellipsis-horizontal" size={21} color={colors.text} />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={23} color={colors.text} />
          )}
        </Pressable>
        <Pressable
          onPress={() => void next()}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Next song"
          style={({ pressed }) => [styles.control, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="play-skip-forward" size={19} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(13,13,18,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.xs,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  control: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
