import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getCoverGradient } from '@/lib/cover';
import { colors, radii } from '@/theme';

type Props = {
  url?: string | null;
  seed?: string | null;
  size?: number;
  width?: number;
  height?: number;
  radius?: number;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
};

export function CoverArt({
  url,
  seed,
  size = 56,
  width,
  height,
  radius = radii.md,
  icon = 'musical-notes',
  style,
}: Props) {
  const [failed, setFailed] = useState(false);
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;
  const gradient = getCoverGradient(seed ?? url);

  return (
    <View
      style={[
        styles.container,
        { width: resolvedWidth, height: resolvedHeight, borderRadius: radius },
        style,
      ]}
    >
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.fallbackInner}>
            <Ionicons
              name={icon}
              size={Math.max(16, Math.min(resolvedWidth, resolvedHeight) * 0.3)}
              color="rgba(255,255,255,0.72)"
            />
          </View>
        </LinearGradient>
      )}
      <View style={[StyleSheet.absoluteFill, styles.border, { borderRadius: radius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
  },
  fallbackInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  border: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
});
