import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme';

export type TextVariant = keyof typeof typography;

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
};

export function AppText({ variant = 'body', color, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[typography[variant], color ? { color } : null, style]}
      allowFontScaling={rest.allowFontScaling ?? true}
    />
  );
}

export const textStyles = StyleSheet.create({
  center: { textAlign: 'center' },
  muted: { color: colors.textSecondary },
});
