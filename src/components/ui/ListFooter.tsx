import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

type Props = {
  loadingMore: boolean;
  hasMore: boolean;
  itemCount: number;
  error?: string | null;
  onRetry?: () => void;
  onLoadMore?: () => void;
};

export function ListFooter({
  loadingMore,
  hasMore,
  itemCount,
  error,
  onRetry,
  onLoadMore,
}: Props) {
  if (itemCount === 0) return null;

  if (error) {
    return (
      <Pressable style={styles.center} onPress={onRetry} accessibilityRole="button">
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
        <AppText variant="captionBold" color={colors.violet}>
          Tap to retry
        </AppText>
      </Pressable>
    );
  }

  if (loadingMore) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.violet} size="small" />
      </View>
    );
  }

  if (hasMore && onLoadMore) {
    return (
      <Pressable style={styles.center} onPress={onLoadMore} accessibilityRole="button">
        <AppText variant="captionBold" color={colors.violet}>
          Load more
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.center}>
      <View style={styles.rule} />
      <AppText variant="caption" color={colors.textTertiary}>
        You&apos;re all caught up
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 4,
  },
  rule: {
    width: 26,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.borderStrong,
    marginBottom: 6,
  },
});
