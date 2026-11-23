import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, gradients, radii, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const heights: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 54 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;
  const contentColor =
    variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.text;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={contentColor} />
          ) : null}
          <AppText
            variant="bodyBold"
            color={contentColor}
            style={[styles.label, { fontSize: size === 'sm' ? 13 : 15 }]}
          >
            {label}
          </AppText>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={contentColor} />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { height: heights[size], opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1 },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.background,
            variant === 'secondary' && styles.secondary,
            variant === 'ghost' && styles.ghost,
            variant === 'danger' && styles.danger,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  background: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(251,113,133,0.35)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    letterSpacing: 0.1,
  },
});
