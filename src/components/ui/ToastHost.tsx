import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useToastStore, type ToastKind } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';

const tone: Record<ToastKind, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  info: { icon: 'information-circle', color: colors.violet },
  success: { icon: 'checkmark-circle', color: colors.success },
  error: { icon: 'alert-circle', color: colors.danger },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { message, kind, visible, id } = useToastStore();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : -80,
        duration: visible ? 260 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [id, opacity, translateY, visible]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.toast}>
        <Ionicons name={tone[kind].icon} size={19} color={tone[kind].color} />
        <AppText variant="smallBold" style={styles.text} numberOfLines={3}>
          {message}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(24,24,31,0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  text: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
