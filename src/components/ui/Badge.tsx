import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/theme';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const toneColors: Record<Tone, { background: string; text: string; border: string }> = {
  neutral: {
    background: colors.surfaceHigh,
    text: colors.textSecondary,
    border: colors.border,
  },
  primary: {
    background: colors.primarySoft,
    text: colors.violet,
    border: 'rgba(192,132,252,0.3)',
  },
  success: {
    background: colors.successSoft,
    text: colors.success,
    border: 'rgba(52,211,153,0.3)',
  },
  warning: {
    background: colors.warningSoft,
    text: colors.warning,
    border: 'rgba(251,191,36,0.3)',
  },
  danger: {
    background: colors.dangerSoft,
    text: colors.danger,
    border: 'rgba(251,113,133,0.3)',
  },
};

type Props = {
  label: string;
  tone?: Tone;
};

export function Badge({ label, tone = 'neutral' }: Props) {
  const palette = toneColors[tone];
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <AppText variant="captionBold" color={palette.text} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
