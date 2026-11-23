import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

type BlockProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ width = '100%', height = 16, radius = radii.sm, style }: BlockProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function SongRowSkeleton() {
  return (
    <View style={styles.songRow}>
      <SkeletonBlock width={52} height={52} radius={12} />
      <View style={styles.songCopy}>
        <SkeletonBlock width="62%" height={13} />
        <SkeletonBlock width="38%" height={11} />
      </View>
    </View>
  );
}

export function SongListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <SongRowSkeleton key={index} />
      ))}
    </View>
  );
}

export function CardRowSkeleton({ count = 4, size = 148 }: { count?: number; size?: number }) {
  return (
    <View style={styles.cardRow}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ width: size, gap: 8 }}>
          <SkeletonBlock width={size} height={size} radius={16} />
          <SkeletonBlock width="80%" height={12} />
          <SkeletonBlock width="55%" height={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceHigh,
  },
  list: {
    gap: 6,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  songCopy: {
    flex: 1,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
});
