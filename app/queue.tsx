import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { formatDuration } from '@/lib/format';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const queue = usePlayerStore((state) => state.queue);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const jumpTo = usePlayerStore((state) => state.jumpTo);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const confirmClear = () => {
    Alert.alert('Clear queue?', 'Playback stops and every song is removed from the queue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void clearQueue().then(() => {
            toast.success('Queue cleared');
            close();
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          icon="chevron-down"
          accessibilityLabel="Close queue"
          onPress={close}
          backgroundColor={colors.surfaceElevated}
          borderColor={colors.border}
        />
        <View style={styles.headerCopy}>
          <AppText variant="h3">Queue</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {queue.length === 1 ? '1 song' : `${queue.length} songs`}
          </AppText>
        </View>
        <Pressable
          onPress={queue.length > 0 ? confirmClear : undefined}
          disabled={queue.length === 0}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear queue"
          style={({ pressed }) => [styles.clear, pressed && { opacity: 0.6 }]}
        >
          <AppText
            variant="smallBold"
            color={queue.length > 0 ? colors.danger : colors.textTertiary}
          >
            Clear
          </AppText>
        </Pressable>
      </View>

      {queue.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title="Your queue is empty"
          message="Start a song or add tracks to build a queue."
          actionLabel="Browse music"
          onAction={close}
        />
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => `queue-${item.id}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          ListHeaderComponent={
            activeIndex >= 0 && queue[activeIndex] ? (
              <View style={styles.nowPlaying}>
                <AppText variant="label" color={colors.violet}>
                  Now playing
                </AppText>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {queue[activeIndex]?.title}
                </AppText>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                onPress={() => void jumpTo(index)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title}`}
                style={({ pressed }) => [
                  styles.row,
                  isActive && styles.rowActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={styles.indexWrap}>
                  {isActive ? (
                    <Ionicons
                      name={isPlaying ? 'volume-high' : 'pause'}
                      size={15}
                      color={colors.violet}
                    />
                  ) : (
                    <AppText variant="caption" color={colors.textTertiary} style={styles.index}>
                      {index + 1}
                    </AppText>
                  )}
                </View>
                <CoverArt url={item.cover_url} seed={item.id} size={46} radius={11} />
                <View style={styles.copy}>
                  <AppText
                    variant="bodyBold"
                    numberOfLines={1}
                    color={isActive ? colors.violet : colors.text}
                  >
                    {item.title}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {item.artist?.name ?? 'Unknown artist'}
                    {item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ''}
                  </AppText>
                </View>
                {isActive ? (
                  <View style={styles.playingDot} />
                ) : (
                  <Pressable
                    onPress={() => void removeFromQueue(item.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title} from queue`}
                    style={({ pressed }) => [styles.remove, pressed && { opacity: 0.5 }]}
                  >
                    <Ionicons name="close" size={18} color={colors.textTertiary} />
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  clear: {
    width: 52,
    alignItems: 'flex-end',
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  nowPlaying: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: 2,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginHorizontal: spacing.sm,
  },
  rowActive: {
    backgroundColor: colors.primarySofter,
  },
  indexWrap: {
    width: 20,
    alignItems: 'center',
  },
  index: {
    fontVariant: ['tabular-nums'],
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  playingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.sm,
  },
  remove: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
