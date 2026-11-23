import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { colors, radii, spacing } from '@/theme';

type Props = {
  title: string;
  subtitle?: string | null;
  artworkUrl?: string | null;
  seed?: string;
  onPress: () => void;
  width?: number;
};

export function PlaylistCard({
  title,
  subtitle,
  artworkUrl,
  seed,
  onPress,
  width = 152,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open playlist ${title}`}
      style={({ pressed }) => [styles.container, { width, opacity: pressed ? 0.78 : 1 }]}
    >
      <CoverArt
        url={artworkUrl}
        seed={seed ?? title}
        size={width}
        radius={radii.lg}
        icon="list"
        style={styles.art}
      />
      <AppText variant="smallBold" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
        {subtitle ?? 'Playlist'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
  },
  art: {
    marginBottom: spacing.xs,
  },
  title: {
    letterSpacing: -0.1,
  },
});
