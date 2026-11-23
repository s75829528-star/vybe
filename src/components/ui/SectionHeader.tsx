import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  eyebrow?: string;
};

export function SectionHeader({ title, subtitle, actionLabel, onAction, eyebrow }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? (
          <AppText variant="label" color={colors.violet} style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="h2">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <AppText variant="smallBold" color={colors.violet}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
});
