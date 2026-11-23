import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getInitials } from '@/lib/format';
import { getCoverGradient } from '@/lib/cover';
import { colors, radii } from '@/theme';

type Props = {
  name?: string | null;
  size?: number;
  seed?: string;
};

export function Avatar({ name, size = 40, seed }: Props) {
  const gradient = getCoverGradient(seed ?? name ?? 'vybe');
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, styles.border, { borderRadius: size / 2 }]} />
      <AppText
        variant="smallBold"
        color={colors.white}
        style={{ fontSize: Math.max(11, size * 0.32), letterSpacing: 0.3 }}
      >
        {getInitials(name)}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  border: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
