import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

type Props = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  transparent?: boolean;
  showBack?: boolean;
  onBack?: () => void;
};

export function ScreenHeader({
  title,
  subtitle,
  right,
  transparent = false,
  showBack = false,
  onBack,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.sm },
        transparent ? styles.transparent : styles.solid,
      ]}
    >
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            onPress={
              onBack ??
              (() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              })
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        {title ? (
          <AppText variant="bodyBold" numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1} color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    minHeight: 54,
    gap: spacing.sm,
  },
  solid: {
    backgroundColor: colors.background,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  side: {
    width: 72,
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(18,18,24,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
