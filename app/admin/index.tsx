import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchBar } from '@/components/ui/SearchBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SongListSkeleton } from '@/components/ui/Skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { getErrorMessage } from '@/lib/errors';
import { formatCompactNumber, formatPublishedDate } from '@/lib/format';
import {
  fetchAdminSongs,
  fetchAdminStats,
  setSongPublished,
  type AdminStats,
} from '@/services/admin';
import { deleteSongAssets } from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { toast } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';
import type { SongWithRelations } from '@/types/database';

export default function AdminHomeScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const session = useAuthStore((state) => state.session);
  const status = useAuthStore((state) => state.status);
  const version = useCatalogueStore((state) => state.version);

  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const fetchPage = useCallback(
    async (offset: number, limit: number) => fetchAdminSongs(debouncedQuery, limit, offset),
    [debouncedQuery],
  );

  const list = usePaginatedList<SongWithRelations>({
    queryKey: `admin-songs:${debouncedQuery}`,
    fetchPage,
    pageSize: 24,
    enabled: isAdmin,
    revision: version,
  });

  const loadStats = useCallback(async () => {
    try {
      const next = await fetchAdminStats();
      setStats(next);
      setStatsError(null);
    } catch (error) {
      setStatsError(getErrorMessage(error, 'Catalogue statistics could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadStats();
  }, [isAdmin, loadStats, version]);

  const handleRefresh = () => {
    setRefreshing(true);
    void Promise.all([list.refresh(), loadStats()]).finally(() => setRefreshing(false));
  };

  const handleTogglePublish = async (song: SongWithRelations) => {
    if (busyId) return;
    setBusyId(song.id);
    try {
      await setSongPublished(song.id, !song.is_published);
      toast.success(song.is_published ? 'Moved to drafts' : 'Song published');
      useCatalogueStore.getState().refresh({ force: true });
      await Promise.all([list.refresh(), loadStats()]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'The song could not be updated.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (song: SongWithRelations) => {
    Alert.alert(
      'Delete song?',
      `“${song.title}” and its uploaded audio and artwork will be deleted permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyId(song.id);
              try {
                await deleteSongAssets(song.id);
                toast.success('Song deleted');
                useCatalogueStore.getState().refresh({ force: true });
                await Promise.all([list.refresh(), loadStats()]);
              } catch (error) {
                toast.error(getErrorMessage(error, 'The song could not be deleted.'));
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  };

  if (status !== 'authenticated') {
    return (
      <View style={styles.root}>
        <ScreenHeader showBack title="Admin" />
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in required"
          message="Sign in with an administrator account to manage the catalogue."
        />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.root}>
        <ScreenHeader showBack title="Admin" />
        <EmptyState
          icon="shield-outline"
          title="Admins only"
          message={`The account ${session?.user.email ?? ''} does not have catalogue permissions. Ask a project administrator to grant the admin role.`}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const statCards: { label: string; value: number; tone: 'neutral' | 'success' | 'warning' }[] = [
    { label: 'Songs', value: stats?.songs ?? 0, tone: 'neutral' },
    { label: 'Published', value: stats?.published ?? 0, tone: 'success' },
    { label: 'Drafts', value: stats?.drafts ?? 0, tone: 'warning' },
    { label: 'Artists', value: stats?.artists ?? 0, tone: 'neutral' },
    { label: 'Albums', value: stats?.albums ?? 0, tone: 'neutral' },
    { label: 'Playlists', value: stats?.playlists ?? 0, tone: 'neutral' },
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader
        showBack
        title="Admin"
        subtitle="Catalogue management"
        right={
          <Button
            label="Upload"
            size="sm"
            icon="add"
            onPress={() => router.push('/admin/song')}
          />
        }
      />

      {list.loading && list.items.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statsGrid}>
            {statCards.map((card) => (
              <View key={card.label} style={styles.statCard}>
                <AppText variant="h2">{card.value}</AppText>
                <AppText variant="caption">{card.label}</AppText>
              </View>
            ))}
          </View>
          <SongListSkeleton count={7} />
        </ScrollView>
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.violet}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surfaceElevated}
            />
          }
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.statsGrid}>
                {statCards.map((card) => (
                  <View key={card.label} style={styles.statCard}>
                    <AppText variant="h2" color={colors.text}>
                      {formatCompactNumber(card.value)}
                    </AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {card.label}
                    </AppText>
                  </View>
                ))}
              </View>

              {statsError ? (
                <Pressable onPress={() => void loadStats()} accessibilityRole="button">
                  <AppText variant="caption" color={colors.danger}>
                    {statsError} Tap to retry.
                  </AppText>
                </Pressable>
              ) : null}

              <View style={styles.listHead}>
                <AppText variant="h3">Songs</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  Tap to edit · long press for actions
                </AppText>
              </View>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Search songs by title"
              />
            </View>
          }
          ListEmptyComponent={
            list.error ? (
              <ErrorState message={list.error} onRetry={() => void list.reload()} />
            ) : (
              <EmptyState
                icon="cloud-upload-outline"
                title={debouncedQuery ? 'No songs matched' : 'No songs yet'}
                message={
                  debouncedQuery
                    ? 'Try a different title.'
                    : 'Upload your first track to start building the VYBE catalogue.'
                }
                actionLabel={debouncedQuery ? undefined : 'Upload a song'}
                onAction={debouncedQuery ? undefined : () => router.push('/admin/song')}
              />
            )
          }
          ListFooterComponent={
            list.items.length > 0 ? (
              <View style={styles.listFooter}>
                {list.loadingMore ? (
                  <AppText variant="caption" color={colors.textTertiary}>
                    Loading…
                  </AppText>
                ) : list.hasMore ? (
                  <Button
                    label="Load more"
                    variant="ghost"
                    size="sm"
                    onPress={() => void list.loadMore()}
                  />
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/admin/song', params: { id: item.id } })}
              onLongPress={() => handleDelete(item)}
              delayLongPress={420}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.title}`}
              style={({ pressed }) => [styles.songRow, pressed && styles.pressed]}
            >
              <CoverArt url={item.cover_url} seed={item.id} size={52} radius={12} />
              <View style={styles.songCopy}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {item.artist?.name ?? 'Unknown artist'}
                  {item.album?.title ? ` · ${item.album.title}` : ''}
                </AppText>
                <View style={styles.songMeta}>
                  <Badge
                    label={item.is_published ? 'Published' : 'Draft'}
                    tone={item.is_published ? 'success' : 'warning'}
                  />
                  <AppText variant="caption" color={colors.textTertiary}>
                    {formatCompactNumber(item.play_count)} plays
                    {item.is_published ? ` · ${formatPublishedDate(item.published_at)}` : ''}
                  </AppText>
                </View>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => void handleTogglePublish(item)}
                  disabled={busyId === item.id}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={item.is_published ? 'Move to drafts' : 'Publish song'}
                  style={({ pressed }) => [styles.rowAction, pressed && { opacity: 0.55 }]}
                >
                  <Ionicons
                    name={item.is_published ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={item.is_published ? colors.textSecondary : colors.violet}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  disabled={busyId === item.id}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.title}`}
                  style={({ pressed }) => [styles.rowAction, pressed && { opacity: 0.55 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </Pressable>
          )}
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
  headerBlock: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 1,
  },
  listHead: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: 2,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  songCopy: {
    flex: 1,
    gap: 3,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowAction: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
