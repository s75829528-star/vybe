import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CoverArt } from '@/components/ui/CoverArt';
import { colors, gradients, radii, spacing } from '@/theme';

type Props = {
  title: string;
  artist: string;
  artworkUrl?: string | null;
  seed?: string;
  onPress: () => void;
  width?: number;
  current?: boolean;
};

export function SongCard({
  title,
  artist,
  artworkUrl,
  seed,
  onPress,
  width = 148,
  current = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${title} by ${artist}`}
      style={({ pressed }) => [styles.container, { width, opacity: pressed ? 0.78 : 1 }]}
    >
      <View style={[styles.artWrap, { width, height: width }]}>
        <CoverArt url={artworkUrl} seed={seed ?? title} size={width} radius={radii.lg} />
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.playBadge}
        >
          <Ionicons
            name={current ? 'pause' : 'play'}
            size={15}
            color={colors.white}
            style={current ? undefined : { marginLeft: 2 }}
          />
        </LinearGradient>
      </View>
      <AppText variant="smallBold" numberOfLines={1} style={styles.title} color={current ? colors.violet : colors.text}>
        {title}
      </AppText>
      <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
        {artist}
      </AppText>
    </Pressable>
  );
}

type CirclePlayProps = {
  onPress: () => void;
  size?: number;
  playing?: boolean;
  disabled?: boolean;
};

export function CirclePlayButton({ onPress, size = 56, playing = false, disabled }: CirclePlayProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={({ pressed }) => [
        styles.circleShadow,
        { width: size, height: size, borderRadius: size / 2, opacity: disabled ? 0.4 : pressed ? 0.82 : 1 },
      ]}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.circle, { borderRadius: size / 2 }]}
      >
        <Ionicons
          name={playing ? 'pause' : 'play'}
          size={size * 0.4}
          color={colors.white}
          style={playing ? undefined : { marginLeft: size * 0.04 }}
        />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  artWrap: {
    marginBottom: spacing.xs,
    position: 'relative',
  },
  playBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    letterSpacing: -0.1,
  },
  circleShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  circle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
