import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListFooter } from '@/components/ui/ListFooter';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SongListSkeleton } from '@/components/ui/Skeleton';
import { SongRow } from '@/features/catalogue/components/SongRow';
import { AddSongsSheet } from '@/features/playlists/components/AddSongsSheet';
import { EditPlaylistSheet } from '@/features/playlists/components/EditPlaylistSheet';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { formatTotalDuration, pluralize } from '@/lib/format';
import {
  deletePlaylist,
  fetchPlaylistById,
  fetchPlaylistSongs,
  removeSongFromPlaylist,
} from '@/services/playlists';
import { useAuthStore } from '@/stores/authStore';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme';
import type { PlaylistWithOwner, SongWithRelations } from '@/types/database';

export default function PlaylistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const version = useCatalogueStore((state) => state.version);
  const libraryVersion = useLibraryStore((state) => state.version);
  const userId = useAuthStore((state) => state.session?.user.id);
  const playSongs = usePlayerStore((state) => state.playSongs);
  const playShuffled = usePlayerStore((state) => state.playShuffled);

  const [playlist, setPlaylist] = useState<PlaylistWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('This playlist could not be found.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchPlaylistById(id)
      .then((result) => {
        if (!active) return;
        setPlaylist(result);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(getErrorMessage(loadError, 'This playlist could not be loaded.'));
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
      const rows = await fetchPlaylistSongs(id, limit, offset);
      return rows
        .map((row) => row.song)
        .filter((song): song is SongWithRelations => Boolean(song));
    },
    [id],
  );

  const list = usePaginatedList<SongWithRelations>({
    queryKey: `playlist:${id}:${version}:${libraryVersion}`,
    fetchPage,
    pageSize: PAGE_SIZE,
    enabled: Boolean(id),
  });

  const songs = list.items;
  const isOwner = Boolean(userId && playlist && playlist.owner_id === userId);
  const totalDuration = songs.reduce((sum, song) => sum + (song.duration_seconds ?? 0), 0);

  const handlePlay = () => {
    if (songs.length === 0) {
      toast.info('Add some songs before pressing play.');
      return;
    }
    void playSongs(songs, 0);
  };

  const handleShuffle = () => {
    if (songs.length === 0) {
      toast.info('Add some songs before shuffling.');
      return;
    }
    void playShuffled(songs);
  };

  const handleRemove = async (song: SongWithRelations) => {
    if (!id || !isOwner || removingId) return;
    setRemovingId(song.id);
    try {
      await removeSongFromPlaylist(id, song.id);
      toast.success(`Removed “${song.title}”`);
      await list.reload();
    } catch (removeError) {
      toast.error(getErrorMessage(removeError, 'That song could not be removed.'));
    } finally {
      setRemovingId(null);
    }
  };

  const confirmDelete = () => {
    if (!playlist) return;
    Alert.alert('Delete playlist?', `“${playlist.title}” will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deletePlaylist(playlist.id);
              useCatalogueStore.getState().refresh({ force: true });
              toast.success('Playlist deleted');
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/library');
              }
            } catch (deleteError) {
              toast.error(getErrorMessage(deleteError, 'The playlist could not be deleted.'));
            }
          })();
        },
      },
    ]);
  };

  const header = (
    <View>
      <View style={styles.hero}>
        <CoverArt
          url={playlist?.cover_url}
          seed={id}
          size={160}
          radius={20}
          icon="list"
          style={styles.cover}
        />
        <View style={styles.heroCopy}>
          <View style={styles.badgeRow}>
            <Badge label={playlist?.is_public ? 'Public playlist' : 'Private playlist'} tone="primary" />
            {isOwner ? <Badge label="Yours" tone="neutral" /> : null}
          </View>
          <AppText variant="h1" style={styles.title} numberOfLines={3}>
            {playlist?.title ?? 'Loading playlist…'}
          </AppText>
          {playlist?.description ? (
            <AppText
              variant="caption"
              color={colors.textSecondary}
              numberOfLines={3}
              style={styles.description}
            >
              {playlist.description}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textTertiary}>
            {playlist?.owner?.display_name ?? 'VYBE'}
            {' · '}
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
          accessibilityLabel="Shuffle playlist"
          onPress={handleShuffle}
          size={48}
          backgroundColor={colors.surfaceHigh}
          borderColor={colors.border}
          disabled={songs.length === 0}
        />
        {isOwner ? (
          <IconButton
            icon="add"
            accessibilityLabel="Add songs"
            onPress={() => setAddOpen(true)}
            size={48}
            backgroundColor={colors.surfaceHigh}
            borderColor={colors.border}
          />
        ) : null}
      </View>

      {isOwner && songs.length === 0 ? (
        <Pressable
          onPress={() => setAddOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addPrompt, pressed && { opacity: 0.7 }]}
        >
          <AppText variant="smallBold" color={colors.violet}>
            Add your first songs
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.sectionHead}>
        <AppText variant="h3">Tracks</AppText>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        showBack
        title="Playlist"
        right={
          isOwner ? (
            <View style={styles.headerActions}>
              <IconButton
                icon="pencil"
                accessibilityLabel="Edit playlist"
                onPress={() => setEditOpen(true)}
              />
              <IconButton
                icon="trash-outline"
                accessibilityLabel="Delete playlist"
                color={colors.danger}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />

      {loading && !playlist ? (
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
              onRemove={isOwner ? () => void handleRemove(item) : undefined}
              removeLabel="Remove from playlist"
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.loading ? (
              <SongListSkeleton count={5} />
            ) : (
              <EmptyState
                icon="list-outline"
                title="Nothing here yet"
                message={
                  isOwner
                    ? 'Add songs to bring this playlist to life.'
                    : 'The owner has not added any songs yet.'
                }
                actionLabel={isOwner ? 'Add songs' : undefined}
                onAction={isOwner ? () => setAddOpen(true) : undefined}
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

      {playlist ? (
        <>
          <AddSongsSheet
            visible={addOpen}
            playlistId={playlist.id}
            existingIds={songs.map((song) => song.id)}
            onClose={() => setAddOpen(false)}
            onAdded={() => {
              useCatalogueStore.getState().refresh({ force: true });
              void list.reload();
            }}
          />
          <EditPlaylistSheet
            visible={editOpen}
            playlist={playlist}
            onClose={() => setEditOpen(false)}
            onUpdated={(updated) => {
              setPlaylist((current) => (current ? { ...current, ...updated } : current));
              useCatalogueStore.getState().refresh({ force: true });
            }}
          />
        </>
      ) : null}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 23,
    lineHeight: 28,
  },
  description: {
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  playButton: {
    flex: 1,
  },
  addPrompt: {
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: 'rgba(192,132,252,0.4)',
    marginBottom: spacing.md,
  },
  sectionHead: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
