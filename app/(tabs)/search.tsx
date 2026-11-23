import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListFooter } from '@/components/ui/ListFooter';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SongListSkeleton } from '@/components/ui/Skeleton';
import { SongRow } from '@/features/catalogue/components/SongRow';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { SEARCH_PAGE_SIZE, STORAGE_KEYS } from '@/lib/constants';
import { colors, radii, spacing } from '@/theme';
import {
  searchAlbums,
  searchArtists,
  searchPlaylists,
  searchSongs,
} from '@/services/catalogue';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { Album, Artist, PlaylistWithOwner, SongWithRelations } from '@/types/database';

type Category = 'songs' | 'artists' | 'albums' | 'playlists';

const CATEGORY_OPTIONS = [
  { value: 'songs' as const, label: 'Songs' },
  { value: 'artists' as const, label: 'Artists' },
  { value: 'albums' as const, label: 'Albums' },
  { value: 'playlists' as const, label: 'Playlists' },
];

const MAX_RECENT = 8;

function normalizeCategory(value: string | undefined): Category {
  return value === 'artists' || value === 'albums' || value === 'playlists' ? value : 'songs';
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const version = useCatalogueStore((state) => state.version);
  const playSong = usePlayerStore((state) => state.playSong);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>(() => normalizeCategory(params.category));
  const [recent, setRecent] = useState<string[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);

  const debouncedQuery = useDebouncedValue(query.trim(), 320);

  useEffect(() => {
    if (params.category) {
      setCategory(normalizeCategory(params.category));
    }
  }, [params.category]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentSearches);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setRecent(parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT));
          }
        }
      } catch {
        // Recent searches are a convenience; failures are not surfaced.
      } finally {
        setRecentLoaded(true);
      }
    })();
  }, []);

  const rememberSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecent((current) => {
      const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        MAX_RECENT,
      );
      void AsyncStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    void AsyncStorage.removeItem(STORAGE_KEYS.recentSearches).catch(() => undefined);
  }, []);

  const fetchPage = useCallback(
    async (offset: number, limit: number) => {
      if (category === 'artists') {
        return searchArtists(debouncedQuery, limit, offset);
      }
      if (category === 'albums') {
        return searchAlbums(debouncedQuery, limit, offset);
      }
      if (category === 'playlists') {
        return searchPlaylists(debouncedQuery, limit, offset);
      }
      return searchSongs({ query: debouncedQuery, limit, offset });
    },
    [category, debouncedQuery],
  );

  const list = usePaginatedList<SongWithRelations | Artist | Album | PlaylistWithOwner>({
    queryKey: `${category}:${debouncedQuery}`,
    fetchPage,
    pageSize: SEARCH_PAGE_SIZE,
    revision: version,
  });

  const handleSubmit = () => {
    rememberSearch(query);
  };

  const renderItem = ({ item }: { item: SongWithRelations | Artist | Album | PlaylistWithOwner }) => {
    if (category === 'songs') {
      const song = item as SongWithRelations;
      return (
        <SongRow
          song={song}
          onPress={() => {
            rememberSearch(query);
            void playSong(song, list.items as SongWithRelations[]);
          }}
          showLike
          showMore
        />
      );
    }

    if (category === 'artists') {
      const artist = item as Artist;
      return (
        <Pressable
          onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open artist ${artist.name}`}
          style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
        >
          <CoverArt url={artist.image_url} seed={artist.name} size={54} radius={27} icon="mic" />
          <View style={styles.entityCopy}>
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

    if (category === 'albums') {
      const album = item as Album & { artist?: { name: string } | null };
      return (
        <Pressable
          onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Open album ${album.title}`}
          style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
        >
          <CoverArt url={album.cover_url} seed={album.id} size={54} radius={12} icon="disc-outline" />
          <View style={styles.entityCopy}>
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

    const playlist = item as PlaylistWithOwner;
    return (
      <Pressable
        onPress={() =>
          router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open playlist ${playlist.title}`}
        style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
      >
        <CoverArt url={playlist.cover_url} seed={playlist.id} size={54} radius={12} icon="list" />
        <View style={styles.entityCopy}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {playlist.title}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            Playlist{playlist.owner?.display_name ? ` · ${playlist.owner.display_name}` : ''}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
      </Pressable>
    );
  };

  const showPrompts = query.trim().length === 0;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <AppText variant="h1" style={styles.title}>
          Search
        </AppText>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={handleSubmit}
          placeholder="Songs, artists, albums, playlists"
        />
        <SegmentedControl
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(next) => {
            setCategory(next);
            list.reload().catch(() => undefined);
          }}
        />
      </View>

      {showPrompts ? (
        <View style={styles.prompts}>
          {recentLoaded && recent.length > 0 ? (
            <>
              <View style={styles.promptHead}>
                <AppText variant="h3">Recent searches</AppText>
                <Pressable onPress={clearRecent} hitSlop={8} accessibilityRole="button">
                  <AppText variant="captionBold" color={colors.violet}>
                    Clear
                  </AppText>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {recent.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => {
                      setQuery(term);
                      rememberSearch(term);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Search for ${term}`}
                    style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                    <AppText variant="small">{term}</AppText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <EmptyState
            icon="search-outline"
            title="Find your next favourite"
            message="Search the full VYBE catalogue by song, artist, album or playlist. Results update as you type."
          />
        </View>
      ) : list.loading ? (
        <SongListSkeleton count={7} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="musical-notes-outline"
          title="No matches"
          message={`Nothing in ${category} matched “${query.trim()}”. Try another spelling or a different category.`}
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={() => void list.refresh()}
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
              error={null}
              onLoadMore={() => void list.loadMore()}
            />
          }
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
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    paddingHorizontal: spacing.xs,
  },
  prompts: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  promptHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    height: 34,
  },
  listContent: {
    paddingBottom: spacing.massive * 1.4,
  },
  entityRow: {
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
  entityCopy: {
    flex: 1,
    gap: 2,
  },
});
