import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/theme';

type Props = PropsWithChildren<{
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}>;

export function Chip({ children, selected = false, onPress, style, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <AppText
        variant="smallBold"
        color={selected ? colors.text : colors.textSecondary}
        style={styles.label}
      >
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(192,132,252,0.5)',
  },
  unselected: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  label: {
    letterSpacing: 0.1,
  },
});
