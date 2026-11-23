import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { LikeButton } from '@/components/ui/LikeButton';
import { colors, radii, spacing } from '@/theme';
import type { SongWithRelations } from '@/types/database';

import { openTrackMenu } from '../trackMenuStore';

type Props = {
  song: SongWithRelations;
  onPress: () => void;
  subtitle?: string;
  index?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  showLike?: boolean;
  showMore?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
};

export function SongRow({
  song,
  onPress,
  subtitle,
  index,
  isActive = false,
  isPlaying = false,
  showLike = true,
  showMore = true,
  onRemove,
  removeLabel,
}: Props) {
  const secondary = subtitle ?? song.artist?.name ?? 'Unknown artist';
  const extra = onRemove
    ? {
        label: removeLabel ?? 'Remove from playlist',
        icon: 'trash-outline' as const,
        destructive: true,
        onPress: onRemove,
      }
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => openTrackMenu(song, extra)}
      delayLongPress={320}
      accessibilityRole="button"
      accessibilityLabel={`Play ${song.title} by ${secondary}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {typeof index === 'number' ? (
        <View style={styles.indexWrap}>
          {isActive ? (
            <Ionicons name={isPlaying ? 'volume-high' : 'pause'} size={14} color={colors.violet} />
          ) : (
            <AppText variant="caption" color={colors.textTertiary} style={styles.index}>
              {index + 1}
            </AppText>
          )}
        </View>
      ) : null}
      <CoverArt url={song.cover_url} seed={song.id} size={50} radius={12} />
      <View style={styles.copy}>
        <AppText
          variant="bodyBold"
          numberOfLines={1}
          color={isActive ? colors.violet : colors.text}
          style={styles.title}
        >
          {song.title}
        </AppText>
        <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
          {secondary}
          {song.album?.title && !subtitle ? ` · ${song.album.title}` : ''}
        </AppText>
      </View>
      {showLike ? <LikeButton songId={song.id} size={18} buttonSize={36} /> : null}
      {showMore ? (
        <Pressable
          onPress={() => openTrackMenu(song, extra)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${song.title}`}
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.55 }]}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderRadius: radii.md,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  indexWrap: {
    width: 18,
    alignItems: 'center',
  },
  index: {
    fontVariant: ['tabular-nums'],
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    letterSpacing: -0.1,
  },
  more: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
