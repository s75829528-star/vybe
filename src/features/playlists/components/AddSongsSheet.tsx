import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBar } from '@/components/ui/SearchBar';
import { Sheet } from '@/components/ui/Sheet';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { getErrorMessage } from '@/lib/errors';
import { searchSongs } from '@/services/catalogue';
import { addSongToPlaylist, fetchSongsForPicker } from '@/services/playlists';
import { toast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme';
import type { SongWithRelations } from '@/types/database';

type Props = {
  visible: boolean;
  playlistId: string;
  existingIds: string[];
  onClose: () => void;
  onAdded: () => void;
};

export function AddSongsSheet({ visible, playlistId, existingIds, onClose, onAdded }: Props) {
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<Record<string, true>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setAdded({});
      setPendingId(null);
    }
  }, [visible]);

  const fetchPage = useCallback(
    async (offset: number, limit: number) => {
      if (debouncedQuery) {
        return searchSongs({ query: debouncedQuery, limit, offset });
      }
      return fetchSongsForPicker(limit, offset, []);
    },
    [debouncedQuery],
  );

  const existingSet = new Set(existingIds);
  const list = usePaginatedList<SongWithRelations>({
    queryKey: `picker:${playlistId}:${debouncedQuery}`,
    fetchPage,
    pageSize: 30,
    enabled: visible,
  });

  const handleAdd = async (song: SongWithRelations) => {
    if (pendingId) return;
    setPendingId(song.id);
    try {
      await addSongToPlaylist(playlistId, song.id);
      setAdded((current) => ({ ...current, [song.id]: true }));
      toast.success(`Added “${song.title}”`);
      onAdded();
    } catch (error) {
      toast.error(getErrorMessage(error, 'That song could not be added.'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add songs"
      subtitle="Search the catalogue and add tracks to this playlist."
      maxHeight="86%"
    >
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search songs" />
      </View>

      {list.loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.violet} />
        </View>
      ) : list.error ? (
        <View style={styles.loading}>
          <AppText variant="small" color={colors.danger} style={styles.center}>
            {list.error}
          </AppText>
          <Pressable onPress={() => void list.reload()} accessibilityRole="button">
            <AppText variant="captionBold" color={colors.violet}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title={debouncedQuery ? 'No matching songs' : 'Everything is added'}
          message={
            debouncedQuery
              ? 'Try a different search term.'
              : 'Every available song is already in this playlist.'
          }
          compact
        />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            list.loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.violet} size="small" />
              </View>
            ) : list.hasMore ? (
              <Pressable
                onPress={() => void list.loadMore()}
                style={styles.footer}
                accessibilityRole="button"
              >
                <AppText variant="captionBold" color={colors.violet}>
                  Load more
                </AppText>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const isAdded = Boolean(added[item.id]) || existingSet.has(item.id);
            return (
              <View style={styles.row}>
                <CoverArt url={item.cover_url} seed={item.id} size={46} radius={11} />
                <View style={styles.copy}>
                  <AppText variant="smallBold" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {item.artist?.name ?? 'Unknown artist'}
                  </AppText>
                </View>
                {isAdded ? (
                  <View style={styles.addedPill}>
                    <AppText variant="captionBold" color={colors.success}>
                      Added
                    </AppText>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => void handleAdd(item)}
                    disabled={pendingId === item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.title} to playlist`}
                    style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.6 }]}
                  >
                    {pendingId === item.id ? (
                      <ActivityIndicator color={colors.violet} size="small" />
                    ) : (
                      <Ionicons name="add" size={21} color={colors.violet} />
                    )}
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  list: {
    maxHeight: 440,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.35)',
  },
  addedPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.successSoft,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
