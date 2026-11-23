import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardRowSkeleton, SongListSkeleton } from '@/components/ui/Skeleton';
import { AlbumCard } from '@/features/catalogue/components/AlbumCard';
import { PlaylistCard } from '@/features/catalogue/components/PlaylistCard';
import { SongCard } from '@/features/catalogue/components/SongCard';
import { ContinueListeningCard } from '@/features/home/components/ContinueListeningCard';
import { getErrorMessage } from '@/lib/errors';
import { getGreeting } from '@/lib/format';
import { fetchHomeFeed, type HomeFeed } from '@/services/catalogue';
import { useAuthStore } from '@/stores/authStore';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { usePlayerStore } from '@/stores/playerStore';
import { colors, radii, spacing } from '@/theme';
import type { SongWithRelations } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const version = useCatalogueStore((state) => state.version);
  const playSong = usePlayerStore((state) => state.playSong);

  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'initial') setLoading(true);
    try {
      const next = await fetchHomeFeed();
      setFeed(next);
      setError(null);
    } catch (loadError) {
      if (mode !== 'silent') {
        setError(getErrorMessage(loadError, 'Your home feed could not be loaded.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(feed ? 'silent' : 'initial');
    // `feed` is intentionally read once per catalogue revision. Including it
    // would reload forever once the first page arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, version]);

  const playFrom = (songs: SongWithRelations[], song: SongWithRelations) => {
    void playSong(song, songs);
  };

  const recentlyPlayed = (feed?.recentlyPlayed ?? [])
    .map((row) => row.song)
    .filter((song): song is SongWithRelations => Boolean(song));

  const isEmpty =
    !loading &&
    !error &&
    feed != null &&
    recentlyPlayed.length === 0 &&
    feed.recentlyAdded.length === 0 &&
    feed.albums.length === 0 &&
    feed.playlists.length === 0 &&
    feed.tamil.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.massive * 1.4,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
            tintColor={colors.violet}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceElevated}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText variant="label" color={colors.violet}>
              VYBE
            </AppText>
            <AppText variant="h1" numberOfLines={1} style={styles.greeting}>
              {getGreeting()}
              {profile?.display_name ? `, ${profile.display_name.split(/\s+/)[0]}` : ''}
            </AppText>
            <AppText variant="small" color={colors.textSecondary}>
              What are we feeling today?
            </AppText>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="search"
              accessibilityLabel="Search music"
              backgroundColor={colors.surfaceElevated}
              borderColor={colors.border}
              onPress={() => router.push('/(tabs)/search')}
            />
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Avatar name={profile?.display_name} size={40} />
            </Pressable>
          </View>
        </View>

        <ContinueListeningCard />

        {loading ? (
          <View style={styles.loading}>
            <View style={styles.skeletonSection}>
              <View style={styles.skeletonTitle} />
              <CardRowSkeleton count={3} size={140} />
            </View>
            <SongListSkeleton count={5} />
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load('initial')} />
        ) : isEmpty ? (
          <EmptyState
            icon="sparkles-outline"
            title="The stage is empty"
            message="Once songs are published, new releases, albums and playlists will appear here."
          />
        ) : (
          <>
            {recentlyPlayed.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  eyebrow="Pick up where you left off"
                  title="Recently played"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                >
                  {recentlyPlayed.map((song) => (
                    <SongCard
                      key={song.id}
                      title={song.title}
                      artist={song.artist?.name ?? 'Unknown artist'}
                      artworkUrl={song.cover_url}
                      seed={song.id}
                      onPress={() => playFrom(recentlyPlayed, song)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {feed && feed.recentlyAdded.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Fresh on VYBE" title="Recently added" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                >
                  {feed.recentlyAdded.map((song) => (
                    <SongCard
                      key={song.id}
                      title={song.title}
                      artist={song.artist?.name ?? 'Unknown artist'}
                      artworkUrl={song.cover_url}
                      seed={song.id}
                      onPress={() => playFrom(feed.recentlyAdded, song)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {feed && feed.albums.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  eyebrow="Full records"
                  title="Albums"
                  actionLabel="See all"
                  onAction={() => router.push('/(tabs)/search?category=albums')}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                >
                  {feed.albums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      title={album.title}
                      artistName={album.artist?.name}
                      artworkUrl={album.cover_url}
                      onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {feed && feed.playlists.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Curated for the mood" title="Playlists" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                >
                  {feed.playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      title={playlist.title}
                      subtitle={playlist.owner?.display_name}
                      artworkUrl={playlist.cover_url}
                      seed={playlist.id}
                      onPress={() =>
                        router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {feed && feed.tamil.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader eyebrow="Made in Tamil Nadu" title="Tamil picks" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                >
                  {feed.tamil.map((song) => (
                    <SongCard
                      key={song.id}
                      title={song.title}
                      artist={song.artist?.name ?? 'Unknown artist'}
                      artworkUrl={song.cover_url}
                      seed={song.id}
                      onPress={() => playFrom(feed.tamil, song)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  greeting: {
    letterSpacing: -0.9,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  row: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  loading: {
    gap: spacing.xxl,
    marginTop: spacing.sm,
  },
  skeletonSection: {
    gap: spacing.md,
  },
  skeletonTitle: {
    height: 16,
    width: 140,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceHigh,
    marginHorizontal: spacing.xl,
  },
});
