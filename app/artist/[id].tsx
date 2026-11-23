import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListFooter } from '@/components/ui/ListFooter';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SongListSkeleton } from '@/components/ui/Skeleton';
import { AlbumCard } from '@/features/catalogue/components/AlbumCard';
import { SongRow } from '@/features/catalogue/components/SongRow';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { fetchArtistAlbums, fetchArtistById, fetchSongs } from '@/services/catalogue';
import { useAuthStore } from '@/stores/authStore';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme';
import type { AlbumWithArtist, Artist, SongWithRelations } from '@/types/database';

export default function ArtistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const version = useCatalogueStore((state) => state.version);
  const libraryVersion = useLibraryStore((state) => state.version);
  const session = useAuthStore((state) => state.session);
  const following = useLibraryStore((state) =>
    id ? Boolean(state.followedArtists[id]) : false,
  );
  const toggleFollowArtist = useLibraryStore((state) => state.toggleFollowArtist);
  const playSongs = usePlayerStore((state) => state.playSongs);
  const playShuffled = usePlayerStore((state) => state.playShuffled);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('This artist could not be found.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchArtistById(id)
      .then((result) => {
        if (!active) return;
        setArtist(result);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(getErrorMessage(loadError, 'This artist could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, version]);

  const fetchSongsPage = useCallback(
    async (offset: number, limit: number) => {
      if (!id) return [];
      return fetchSongs({ artistId: id, limit, offset, sort: 'plays' });
    },
    [id],
  );

  const tracks = usePaginatedList<SongWithRelations>({
    queryKey: `artist-tracks:${id}:${version}:${libraryVersion}`,
    fetchPage: fetchSongsPage,
    pageSize: PAGE_SIZE,
    enabled: Boolean(id),
  });

  const fetchAlbumsPage = useCallback(
    async (offset: number, limit: number) => {
      if (!id) return [];
      return fetchArtistAlbums(id, limit, offset);
    },
    [id],
  );

  const albums = usePaginatedList<AlbumWithArtist>({
    queryKey: `artist-albums:${id}:${version}`,
    fetchPage: fetchAlbumsPage,
    pageSize: 12,
    enabled: Boolean(id),
  });

  const handleFollow = () => {
    if (!session) {
      toast.info('Sign in to follow artists.');
      return;
    }
    if (!id) return;
    void toggleFollowArtist(id)
      .then((nowFollowing) => {
        toast.success(nowFollowing ? 'Following artist' : 'Unfollowed artist');
      })
      .catch(() => undefined);
  };

  const handlePlay = () => {
    if (tracks.items.length === 0) {
      toast.info('No songs are available for this artist yet.');
      return;
    }
    void playSongs(tracks.items, 0);
  };

  const handleShuffle = () => {
    if (tracks.items.length === 0) {
      toast.info('No songs are available for this artist yet.');
      return;
    }
    void playShuffled(tracks.items);
  };

  const header = (
    <View>
      <View style={styles.hero}>
        <CoverArt
          url={artist?.image_url}
          seed={artist?.name ?? id}
          size={132}
          radius={66}
          icon="mic"
          style={styles.avatar}
        />
        <AppText variant="label" color={colors.violet}>
          Artist
        </AppText>
        <AppText variant="h1" style={styles.name}>
          {artist?.name ?? 'Loading artist…'}
        </AppText>
        {artist?.bio ? (
          <AppText variant="small" color={colors.textSecondary} style={styles.bio} numberOfLines={4}>
            {artist.bio}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label="Play"
          icon="play"
          onPress={handlePlay}
          fullWidth
          style={styles.playButton}
          disabled={tracks.items.length === 0}
        />
        <IconButton
          icon="shuffle"
          accessibilityLabel="Shuffle artist"
          onPress={handleShuffle}
          size={48}
          backgroundColor={colors.surfaceHigh}
          borderColor={colors.border}
          disabled={tracks.items.length === 0}
        />
        <IconButton
          icon={following ? 'person-remove-outline' : 'person-add-outline'}
          color={following ? colors.violet : colors.text}
          accessibilityLabel={following ? 'Unfollow artist' : 'Follow artist'}
          onPress={handleFollow}
          size={48}
          backgroundColor={colors.surfaceHigh}
          borderColor={colors.border}
        />
      </View>

      {albums.items.length > 0 ? (
        <View style={styles.albumsSection}>
          <View style={styles.sectionHead}>
            <AppText variant="h3">Albums</AppText>
            {albums.hasMore ? (
              <Pressable
                onPress={() => void albums.loadMore()}
                accessibilityRole="button"
                accessibilityLabel="Load more albums"
                hitSlop={8}
              >
                <AppText variant="captionBold" color={colors.violet}>
                  More
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumRow}
          >
            {albums.items.map((album) => (
              <AlbumCard
                key={album.id}
                title={album.title}
                artistName={album.artist?.name}
                artworkUrl={album.cover_url}
                width={140}
                onPress={() =>
                  router.push({ pathname: '/album/[id]', params: { id: album.id } })
                }
              />
            ))}
            {albums.loadingMore ? (
              <View style={styles.albumLoading}>
                <AppText variant="caption" color={colors.textTertiary}>
                  Loading…
                </AppText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionHead}>
        <AppText variant="h3">Popular tracks</AppText>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader showBack title="Artist" />

      {loading && !artist ? (
        <View style={styles.loading}>
          <SongListSkeleton count={8} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => router.back()} />
      ) : (
        <FlatList
          data={tracks.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              index={index}
              onPress={() => void playSongs(tracks.items, index)}
              subtitle={item.album?.title ?? undefined}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            tracks.loading ? (
              <SongListSkeleton count={5} />
            ) : (
              <EmptyState
                icon="musical-notes-outline"
                title="No tracks yet"
                message="Published songs by this artist will appear here."
                compact
              />
            )
          }
          ListFooterComponent={
            tracks.items.length > 0 ? (
              <ListFooter
                loadingMore={tracks.loadingMore}
                hasMore={tracks.hasMore}
                itemCount={tracks.items.length}
                error={tracks.error}
                onRetry={() => void tracks.loadMore()}
                onLoadMore={() => void tracks.loadMore()}
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
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  avatar: {
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  name: {
    textAlign: 'center',
  },
  bio: {
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 19,
    maxWidth: 380,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  playButton: {
    flex: 1,
  },
  albumsSection: {
    marginBottom: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  albumRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  albumLoading: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
