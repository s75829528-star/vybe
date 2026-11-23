import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, gradients, radii, spacing } from '@/theme';

type Props = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: Props) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <LinearGradient
        colors={gradients.primarySoft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Ionicons name={icon} size={26} color={colors.violet} />
      </LinearGradient>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" color={colors.textSecondary} style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="sm"
          variant="secondary"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
    gap: spacing.sm,
  },
  compact: {
    paddingVertical: spacing.xxl,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.25)',
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.sm,
  },
});
