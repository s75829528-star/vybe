import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing } from '@/theme';

type Props = {
  name: string;
  imageUrl?: string | null;
  onPress: () => void;
  width?: number;
  subtitle?: string;
};

export function ArtistCard({ name, imageUrl, onPress, width = 112, subtitle }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open artist ${name}`}
      style={({ pressed }) => [styles.container, { width, opacity: pressed ? 0.78 : 1 }]}
    >
      <View style={[styles.avatarWrap, { width, height: width, borderRadius: width / 2 }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={160}
            cachePolicy="memory-disk"
          />
        ) : (
          <Avatar name={name} seed={name} size={width} />
        )}
      </View>
      <AppText variant="smallBold" numberOfLines={1} style={styles.name}>
        {name}
      </AppText>
      <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
        {subtitle ?? 'Artist'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 5,
  },
  avatarWrap: {
    marginBottom: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
  name: {
    textAlign: 'center',
  },
});
