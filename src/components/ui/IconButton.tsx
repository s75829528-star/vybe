import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  onPress,
  size = 40,
  iconSize = 20,
  color = colors.text,
  backgroundColor = 'transparent',
  borderColor,
  disabled,
  accessibilityLabel,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
