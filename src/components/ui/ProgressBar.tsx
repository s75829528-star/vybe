import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

type Props = {
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
};

export function ProgressBar({
  progress,
  height = 3,
  color = colors.violet,
  trackColor = 'rgba(255,255,255,0.12)',
}: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.pill,
  },
});
