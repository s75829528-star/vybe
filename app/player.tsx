import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgress } from 'react-native-track-player';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CoverArt } from '@/components/ui/CoverArt';
import { IconButton } from '@/components/ui/IconButton';
import { LikeButton } from '@/components/ui/LikeButton';
import { formatDuration } from '@/lib/format';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/stores/toastStore';
import { colors, gradients, radii, spacing } from '@/theme';

function RepeatGlyph({ mode }: { mode: 'off' | 'all' | 'one' }) {
  return (
    <View>
      <Ionicons
        name="repeat"
        size={21}
        color={mode === 'off' ? colors.textTertiary : colors.violet}
      />
      {mode === 'one' ? (
        <View style={styles.repeatBadge}>
          <AppText variant="captionBold" color={colors.white} style={styles.repeatBadgeText}>
            1
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const queue = usePlayerStore((state) => state.queue);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const error = usePlayerStore((state) => state.error);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const next = usePlayerStore((state) => state.next);
  const previous = usePlayerStore((state) => state.previous);
  const seek = usePlayerStore((state) => state.seek);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);

  const track = queue[activeIndex];
  const progress = useProgress(250);
  const [seekValue, setSeekValue] = useState<number | null>(null);

  const artworkSize = Math.min(width - spacing.xxl * 2, 360);
  const duration = progress.duration > 0 ? progress.duration : (track?.duration_seconds ?? 0);
  const position = seekValue ?? progress.position;
  const fraction = duration > 0 ? Math.min(1, position / duration) : 0;

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (!track) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={gradients.player} style={StyleSheet.absoluteFill} />
        <View style={[styles.emptyWrap, { paddingTop: insets.top + spacing.xl }]}>
          <IconButton
            icon="chevron-down"
            accessibilityLabel="Close player"
            backgroundColor={colors.surfaceElevated}
            borderColor={colors.border}
            onPress={close}
            style={styles.emptyClose}
          />
          <View style={styles.emptyBody}>
            <Ionicons name="musical-notes-outline" size={40} color={colors.textTertiary} />
            <AppText variant="h2" style={styles.center}>
              Nothing playing
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.center}>
              Pick a song and it will show up here with full controls.
            </AppText>
            <Button label="Browse music" icon="search" onPress={close} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.player} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-down"
            accessibilityLabel="Close player"
            onPress={close}
          />
          <View style={styles.topBarCopy}>
            <AppText variant="captionBold" color={colors.textSecondary}>
              Now playing
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              {activeIndex + 1} of {queue.length}
            </AppText>
          </View>
          <IconButton
            icon="list"
            accessibilityLabel="Open queue"
            onPress={() => router.push('/queue')}
          />
        </View>

        <View style={styles.artWrap}>
          <View style={[styles.artGlow, { width: artworkSize * 0.8 }]} />
          <CoverArt
            url={track.cover_url}
            seed={track.id}
            width={artworkSize}
            height={artworkSize}
            radius={radii.xxl}
            style={styles.art}
          />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCopy}>
            <AppText variant="h2" numberOfLines={2}>
              {track.title}
            </AppText>
            <Pressable
              onPress={() => {
                if (track.artist) {
                  router.push({ pathname: '/artist/[id]', params: { id: track.artist.id } });
                }
              }}
              disabled={!track.artist}
              accessibilityRole="button"
              accessibilityLabel={track.artist ? `Open artist ${track.artist.name}` : 'Unknown artist'}
            >
              <AppText variant="body" color={colors.textSecondary} numberOfLines={1}>
                {track.artist?.name ?? 'Unknown artist'}
              </AppText>
            </Pressable>
          </View>
          <LikeButton songId={track.id} size={24} buttonSize={46} filledBackground />
        </View>

        <View style={styles.seekBlock}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={seekValue ?? Math.min(progress.position, duration > 0 ? duration : 1)}
            onSlidingStart={() => setSeekValue(progress.position)}
            onValueChange={(value) => setSeekValue(value)}
            onSlidingComplete={(value) => {
              void seek(value);
              setSeekValue(null);
            }}
            disabled={duration <= 0}
            minimumTrackTintColor={colors.violet}
            maximumTrackTintColor="rgba(255,255,255,0.16)"
            thumbTintColor={colors.violet}
            accessibilityLabel="Seek"
          />
          <View style={styles.timeRow}>
            <AppText variant="caption" color={colors.textTertiary}>
              {formatDuration(position)}
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              {formatDuration(duration)}
            </AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fraction * 100}%` }]} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={styles.errorText} numberOfLines={2}>
              {error}
            </AppText>
          </View>
        ) : null}

        <View style={styles.controls}>
          <Pressable
            onPress={() => void toggleShuffle()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
            accessibilityState={{ selected: shuffle }}
            style={({ pressed }) => [styles.sideControl, pressed && { opacity: 0.6 }]}
          >
            <Ionicons
              name="shuffle"
              size={21}
              color={shuffle ? colors.violet : colors.textTertiary}
            />
          </Pressable>

          <Pressable
            onPress={() => void previous()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous song"
            style={({ pressed }) => [styles.transport, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => void togglePlay()}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            accessibilityState={{ busy: isBuffering }}
            style={({ pressed }) => [styles.playWrap, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playCircle}
            >
              <Ionicons
                name={isBuffering ? 'ellipsis-horizontal' : isPlaying ? 'pause' : 'play'}
                size={32}
                color={colors.white}
                style={isPlaying || isBuffering ? undefined : { marginLeft: 3 }}
              />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => void next()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next song"
            style={({ pressed }) => [styles.transport, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => void cycleRepeat()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Repeat ${repeatMode}`}
            style={({ pressed }) => [styles.sideControl, pressed && { opacity: 0.6 }]}
          >
            <RepeatGlyph mode={repeatMode} />
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={() => router.push('/queue')}
            accessibilityRole="button"
            accessibilityLabel="Open queue"
            style={({ pressed }) => [styles.bottomAction, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="list" size={19} color={colors.textSecondary} />
            <AppText variant="caption" color={colors.textSecondary}>
              Queue
            </AppText>
          </Pressable>
          <Pressable
            onPress={() =>
              toast.info('Offline downloads are not available yet. Streaming needs a connection.')
            }
            accessibilityRole="button"
            accessibilityLabel="Download song (placeholder)"
            style={({ pressed }) => [styles.bottomAction, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="cloud-download-outline" size={19} color={colors.textSecondary} />
            <AppText variant="caption" color={colors.textSecondary}>
              Download
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarCopy: {
    alignItems: 'center',
    gap: 1,
  },
  artWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  artGlow: {
    position: 'absolute',
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryDeep,
    opacity: 0.35,
  },
  art: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaCopy: {
    flex: 1,
    gap: 3,
  },
  seekBlock: {
    marginTop: spacing.md,
  },
  slider: {
    width: '100%',
    height: 34,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.violet,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  sideControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transport: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  playCircle: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadge: {
    position: 'absolute',
    right: -5,
    top: -3,
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  repeatBadgeText: {
    fontSize: 8,
    lineHeight: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxxl,
    marginTop: spacing.xl,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  emptyClose: {
    alignSelf: 'flex-start',
  },
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
