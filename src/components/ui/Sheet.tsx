import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/theme';

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxHeight?: `${number}%` | number;
}>;

export function Sheet({ visible, onClose, title, subtitle, maxHeight = '88%', children }: Props) {
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [progress, visible]);

  if (!rendered) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] });

  return (
    <Modal
      visible={rendered}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Animated.View
            style={[
              styles.sheet,
              { maxHeight, paddingBottom: Math.max(insets.bottom, spacing.xl), transform: [{ translateY }] },
            ]}
          >
            <View style={styles.grabber} />
            {title ? (
              <View style={styles.header}>
                <AppText variant="h3">{title}</AppText>
                {subtitle ? (
                  <AppText variant="small" color={colors.textSecondary} style={styles.subtitle}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
            ) : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  keyboard: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: 4,
  },
  subtitle: {
    lineHeight: 19,
  },
});
