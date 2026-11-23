import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';

type Props = {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({ message, onRetry, compact = false }: Props) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <AppText variant="h3" style={styles.title}>
        Something went off-key
      </AppText>
      <AppText variant="small" color={colors.textSecondary} style={styles.message}>
        {message}
      </AppText>
      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          size="sm"
          variant="secondary"
          icon="refresh"
          style={styles.button}
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
    paddingVertical: spacing.xl,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
  },
});
