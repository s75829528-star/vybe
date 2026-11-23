import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { Sheet } from '@/components/ui/Sheet';
import { useTrackMenuStore } from '@/features/catalogue/trackMenuStore';
import { useAuthStore } from '@/stores/authStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';

type Action = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  hidden?: boolean;
};

export function TrackActionsHost() {
  const router = useRouter();
  const song = useTrackMenuStore((state) => state.song);
  const extra = useTrackMenuStore((state) => state.extra);
  const close = useTrackMenuStore((state) => state.close);

  const session = useAuthStore((state) => state.session);
  const liked = useLibraryStore((state) => (song ? Boolean(state.liked[song.id]) : false));
  const toggleLike = useLibraryStore((state) => state.toggleLike);

  const playSong = usePlayerStore((state) => state.playSong);
  const playNext = usePlayerStore((state) => state.playNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const activeSongId = usePlayerStore((state) => state.queue[state.activeIndex]?.id);

  if (!song) return null;

  const actions: Action[] = [
    {
      label: 'Play now',
      icon: 'play',
      onPress: () => {
        void playSong(song);
      },
    },
    {
      label: 'Play next',
      icon: 'play-forward',
      onPress: () => {
        void playNext(song);
      },
    },
    {
      label: 'Add to queue',
      icon: 'list',
      onPress: () => {
        void addToQueue(song);
      },
    },
    {
      label: liked ? 'Remove from liked songs' : 'Like song',
      icon: liked ? 'heart' : 'heart-outline',
      onPress: () => {
        if (!session) {
          toast.info('Sign in to save songs to your library.');
          return;
        }
        void toggleLike(song.id).catch(() => undefined);
      },
    },
    {
      label: 'Go to album',
      icon: 'disc-outline',
      hidden: !song.album,
      onPress: () => {
        if (song.album) {
          router.push({ pathname: '/album/[id]', params: { id: song.album.id } });
        }
      },
    },
    {
      label: 'Go to artist',
      icon: 'person-outline',
      hidden: !song.artist,
      onPress: () => {
        if (song.artist) {
          router.push({ pathname: '/artist/[id]', params: { id: song.artist.id } });
        }
      },
    },
  ];

  if (extra) {
    actions.push({
      label: extra.label,
      icon: extra.icon,
      destructive: extra.destructive,
      onPress: () => {
        void extra.onPress();
      },
    });
  }

  const visibleActions = actions.filter((action) => !action.hidden);

  return (
    <Sheet visible onClose={close} title="Track options" maxHeight="82%">
      <View style={styles.track}>
        <CoverArt url={song.cover_url} seed={song.id} size={54} radius={12} />
        <View style={styles.trackCopy}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {song.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
            {song.artist?.name ?? 'Unknown artist'}
            {activeSongId === song.id ? ' · Now playing' : ''}
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.actions} showsVerticalScrollIndicator={false}>
        {visibleActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              close();
              action.onPress();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <View
              style={[
                styles.actionIcon,
                action.destructive && { backgroundColor: colors.dangerSoft },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={19}
                color={action.destructive ? colors.danger : colors.text}
              />
            </View>
            <AppText
              variant="bodyMedium"
              color={action.destructive ? colors.danger : colors.text}
              style={styles.actionLabel}
            >
              {action.label}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  trackCopy: {
    flex: 1,
    gap: 3,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  actionPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
  },
});
