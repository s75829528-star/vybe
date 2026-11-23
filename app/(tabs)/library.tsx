import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListFooter } from '@/components/ui/ListFooter';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SongListSkeleton } from '@/components/ui/Skeleton';
import { SongRow } from '@/features/catalogue/components/SongRow';
import { CreatePlaylistSheet } from '@/features/playlists/components/CreatePlaylistSheet';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { PAGE_SIZE } from '@/lib/constants';
import {
  fetchFollowedArtists,
  fetchLikedSongs,
  fetchSavedAlbums,
} from '@/services/library';
import { fetchOwnedPlaylists } from '@/services/playlists';
import { useAuthStore } from '@/stores/authStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { colors, radii, spacing } from '@/theme';
import type {
  AlbumWithArtist,
  Artist,
  PlaylistWithOwner,
  SongWithRelations,
} from '@/types/database';

type Tab = 'songs' | 'albums' | 'artists' | 'playlists' | 'downloads';

const TABS = [
  { value: 'songs' as const, label: 'Songs' },
  { value: 'albums' as const, label: 'Albums' },
  { value: 'artists' as const, label: 'Artists' },
  { value: 'playlists' as const, label: 'Playlists' },
  { value: 'downloads' as const, label: 'Downloads' },
];

type LibraryItem = SongWithRelations | AlbumWithArtist | Artist | PlaylistWithOwner;

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const userId = useAuthStore((state) => state.session?.user.id);
  const version = useLibraryStore((state) => state.version);
  const likedCount = useLibraryStore((state) => Object.keys(state.liked).length);
  const playSong = usePlayerStore((state) => state.playSong);

  const [tab, setTab] = useState<Tab>('songs');
  const [createOpen, setCreateOpen] = useState(false);
  const listRef = useRef<FlatList<LibraryItem>>(null);

  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<LibraryItem[]> => {
      if (!userId) return [];
      if (tab === 'songs') {
        const rows = await fetchLikedSongs(limit, offset);
        return rows
          .map((row) => row.song)
          .filter((song): song is SongWithRelations => Boolean(song));
      }
      if (tab === 'albums') {
        const rows = await fetchSavedAlbums(limit, offset);
        return rows
          .map((row) => row.album)
          .filter((album): album is AlbumWithArtist => Boolean(album));
      }
      if (tab === 'artists') {
        const rows = await fetchFollowedArtists(limit, offset);
        return rows
          .map((row) => row.artist)
          .filter((artist): artist is Artist => Boolean(artist));
      }
      if (tab === 'playlists') {
        return fetchOwnedPlaylists(userId, limit, offset);
      }
      return [];
    },
    [tab, userId],
  );

  const list = usePaginatedList<LibraryItem>({
    queryKey: `${tab}:${userId ?? 'anonymous'}`,
    fetchPage,
    pageSize: PAGE_SIZE,
    enabled: Boolean(userId) && tab !== 'downloads',
    revision: version,
  });

  const handleRefresh = () => {
    useLibraryStore.getState().refresh();
    void list.refresh();
  };

  const renderItem = ({ item }: { item: LibraryItem }) => {
    if (tab === 'songs') {
      const song = item as SongWithRelations;
      return (
        <SongRow
          song={song}
          onPress={() => void playSong(song, list.items as SongWithRelations[])}
        />
      );
    }

    if (tab === 'albums') {
      const album = item as AlbumWithArtist;
      return (
        <Pressable
          onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open album ${album.title}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <CoverArt url={album.cover_url} seed={album.id} size={54} radius={12} icon="disc-outline" />
          <View style={styles.rowCopy}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {album.title}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {album.artist?.name ?? 'Various artists'}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
        </Pressable>
      );
    }

    if (tab === 'artists') {
      const artist = item as Artist;
      return (
        <Pressable
          onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open artist ${artist.name}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <CoverArt url={artist.image_url} seed={artist.name} size={54} radius={27} icon="mic" />
          <View style={styles.rowCopy}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {artist.name}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              Artist
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
        </Pressable>
      );
    }

    const playlist = item as PlaylistWithOwner;
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Open playlist ${playlist.title}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <CoverArt url={playlist.cover_url} seed={playlist.id} size={54} radius={12} icon="list" />
        <View style={styles.rowCopy}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {playlist.title}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {playlist.is_public ? 'Public playlist' : 'Private playlist'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
      </Pressable>
    );
  };

  const emptyState = () => {
    if (tab === 'songs') {
      return (
        <EmptyState
          icon="heart-outline"
          title="No liked songs yet"
          message="Tap the heart on any track and it will live here, ready for repeat plays."
          actionLabel="Find music"
          onAction={() => router.push('/(tabs)/search')}
        />
      );
    }
    if (tab === 'albums') {
      return (
        <EmptyState
          icon="disc-outline"
          title="No saved albums"
          message="Save an album from its page to keep it in your library."
        />
      );
    }
    if (tab === 'artists') {
      return (
        <EmptyState
          icon="people-outline"
          title="No followed artists"
          message="Follow artists to see them here and keep their music close."
        />
      );
    }
    if (tab === 'playlists') {
      return (
        <EmptyState
          icon="list-outline"
          title="No playlists yet"
          message="Build a set for a mood, a drive or a late night. You can add songs right after creating it."
          actionLabel="Create playlist"
          onAction={() => setCreateOpen(true)}
        />
      );
    }
    return (
      <EmptyState
        icon="cloud-download-outline"
        title="Downloads are a placeholder"
        message="Offline downloads are not implemented in this build. Streaming works while you are connected. This tab is reserved for a future offline mode."
      />
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <View style={styles.identity}>
            <Avatar name={profile?.display_name} size={46} />
            <View style={styles.identityCopy}>
              <AppText variant="label" color={colors.violet}>
                Your library
              </AppText>
              <AppText variant="h2" numberOfLines={1}>
                {profile?.display_name ?? 'Listener'}
              </AppText>
            </View>
          </View>
          <IconButton
            icon="add"
            accessibilityLabel="Create playlist"
            backgroundColor={colors.surfaceElevated}
            borderColor={colors.border}
            onPress={() => setCreateOpen(true)}
          />
        </View>
        <AppText variant="caption" color={colors.textTertiary} style={styles.countLine}>
          {likedCount === 1 ? '1 liked song' : `${likedCount} liked songs`}
        </AppText>
        <SegmentedControl options={TABS} value={tab} onChange={(next) => setTab(next)} />
      </View>

      {tab === 'downloads' ? (
        <View style={styles.downloads}>{emptyState()}</View>
      ) : list.loading ? (
        <SongListSkeleton count={7} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      ) : list.items.length === 0 ? (
        <View style={styles.downloads}>{emptyState()}</View>
      ) : (
        <FlatList
          ref={listRef}
          data={list.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.violet}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surfaceElevated}
            />
          }
          ListFooterComponent={
            <ListFooter
              loadingMore={list.loadingMore}
              hasMore={list.hasMore}
              itemCount={list.items.length}
              onLoadMore={() => void list.loadMore()}
            />
          }
        />
      )}

      <CreatePlaylistSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(playlistId) => {
          useLibraryStore.getState().refresh();
          setTab('playlists');
          router.push({ pathname: '/playlist/[id]', params: { id: playlistId } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityCopy: {
    flex: 1,
    gap: 1,
  },
  countLine: {
    marginTop: -spacing.sm,
    marginLeft: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.massive * 1.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  downloads: {
    flex: 1,
    justifyContent: 'center',
  },
});
