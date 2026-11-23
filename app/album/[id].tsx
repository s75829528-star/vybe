import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListFooter } from '@/components/ui/ListFooter';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SongListSkeleton } from '@/components/ui/Skeleton';
import { SongRow } from '@/features/catalogue/components/SongRow';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { formatTotalDuration, pluralize } from '@/lib/format';
import { fetchAlbumById, fetchSongs } from '@/services/catalogue';
import { useAuthStore } from '@/stores/authStore';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';
import type { AlbumWithArtist, SongWithRelations } from '@/types/database';

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const version = useCatalogueStore((state) => state.version);
  const libraryVersion = useLibraryStore((state) => state.version);
  const session = useAuthStore((state) => state.session);
  const saved = useLibraryStore((state) => (id ? Boolean(state.savedAlbums[id]) : false));
  const toggleSaveAlbum = useLibraryStore((state) => state.toggleSaveAlbum);
  const playSongs = usePlayerStore((state) => state.playSongs);
  const playShuffled = usePlayerStore((state) => state.playShuffled);

  const [album, setAlbum] = useState<AlbumWithArtist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('This album could not be found.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchAlbumById(id)
      .then((result) => {
        if (!active) return;
        setAlbum(result);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(getErrorMessage(loadError, 'This album could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, version]);

  const fetchPage = useCallback(
    async (offset: number, limit: number) => {
      if (!id) return [];
      return fetchSongs({ albumId: id, limit, offset, sort: 'track' });
    },
    [id],
  );

  const list = usePaginatedList<SongWithRelations>({
    queryKey: `album:${id}:${version}:${libraryVersion}`,
    fetchPage,
    pageSize: PAGE_SIZE,
    enabled: Boolean(id),
  });

  const songs = list.items;
  const totalDuration = songs.reduce((sum, song) => sum + (song.duration_seconds ?? 0), 0);

  const handlePlay = () => {
    if (songs.length === 0) {
      toast.info('This album has no playable songs yet.');
      return;
    }
    void playSongs(songs, 0);
  };

  const handleShuffle = () => {
    if (songs.length === 0) {
      toast.info('This album has no playable songs yet.');
      return;
    }
    void playShuffled(songs);
  };

  const handleSave = () => {
    if (!session) {
      toast.info('Sign in to save albums.');
      return;
    }
    if (!id) return;
    void toggleSaveAlbum(id).catch(() => undefined);
  };

  const header = (
    <View>
      <View style={styles.hero}>
        <CoverArt
          url={album?.cover_url}
          seed={id}
          size={168}
          radius={radii.xl}
          icon="disc-outline"
          style={styles.cover}
        />
        <View style={styles.heroCopy}>
          <AppText variant="label" color={colors.violet}>
            Album
          </AppText>
          <AppText variant="h1" style={styles.title}>
            {album?.title ?? 'Loading album…'}
          </AppText>
          <Pressable
            onPress={() => {
              if (album?.artist) {
                router.push({ pathname: '/artist/[id]', params: { id: album.artist.id } });
              }
            }}
            disabled={!album?.artist}
            accessibilityRole="button"
            accessibilityLabel={
              album?.artist ? `Open artist ${album.artist.name}` : 'Unknown artist'
            }
          >
            <AppText variant="bodyBold" color={colors.textSecondary}>
              {album?.artist?.name ?? 'Various artists'}
            </AppText>
          </Pressable>
          <AppText variant="caption" color={colors.textTertiary}>
            {album?.release_year ? `${album.release_year} · ` : ''}
            {list.hasMore ? `${songs.length}+ songs` : pluralize(songs.length, 'song')}
            {!list.hasMore && totalDuration > 0 ? ` · ${formatTotalDuration(totalDuration)}` : ''}
          </AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="Play"
          icon="play"
          onPress={handlePlay}
          fullWidth
          style={styles.playButton}
          disabled={songs.length === 0}
        />
        <IconButton
          icon="shuffle"
          accessibilityLabel="Shuffle album"
          onPress={handleShuffle}
          size={48}
          backgroundColor={colors.surfaceHigh}
          borderColor={colors.border}
          disabled={songs.length === 0}
        />
        <IconButton
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          color={saved ? colors.violet : colors.text}
          accessibilityLabel={saved ? 'Remove saved album' : 'Save album'}
          onPress={handleSave}
          size={48}
          backgroundColor={colors.surfaceHigh}
          borderColor={colors.border}
        />
      </View>

      <View style={styles.sectionHead}>
        <AppText variant="h3">Tracks</AppText>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        showBack
        title="Album"
        right={
          <IconButton
            icon="ellipsis-horizontal"
            accessibilityLabel="Album options"
            onPress={() => {
              if (album?.artist) {
                router.push({ pathname: '/artist/[id]', params: { id: album.artist.id } });
              }
            }}
          />
        }
      />

      {loading && !album ? (
        <View style={styles.loading}>
          <SongListSkeleton count={8} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => router.back()} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              index={index}
              onPress={() => void playSongs(songs, index)}
              showLike
              showMore
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.loading ? (
              <SongListSkeleton count={5} />
            ) : (
              <EmptyState
                icon="musical-notes-outline"
                title="No tracks yet"
                message="Songs added to this album will appear here."
                compact
              />
            )
          }
          ListFooterComponent={
            songs.length > 0 ? (
              <ListFooter
                loadingMore={list.loadingMore}
                hasMore={list.hasMore}
                itemCount={songs.length}
                error={list.error}
                onRetry={() => void list.loadMore()}
                onLoadMore={() => void list.loadMore()}
              />
            ) : null
          }
          contentContainerStyle={styles.content}
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
  content: {
    paddingBottom: spacing.huge,
  },
  loading: {
    paddingTop: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  cover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    lineHeight: 29,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  playButton: {
    flex: 1,
  },
  sectionHead: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
