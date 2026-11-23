import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { TAB_BAR_BASE_HEIGHT } from '@/lib/constants';
import { colors, spacing } from '@/theme';

const icons: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { active: 'home', inactive: 'home-outline', label: 'Home' },
  search: { active: 'search', inactive: 'search-outline', label: 'Search' },
  library: { active: 'library', inactive: 'library-outline', label: 'Library' },
  settings: { active: 'settings', inactive: 'settings-outline', label: 'Settings' },
};

export function VibeTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <MiniPlayer />
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {state.routes.map((route, index) => {
          const config = icons[route.name] ?? {
            active: 'ellipse' as const,
            inactive: 'ellipse-outline' as const,
            label: route.name,
          };
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={config.label}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.65 }]}
            >
              <Ionicons
                name={focused ? config.active : config.inactive}
                size={22}
                color={focused ? colors.violet : colors.textTertiary}
              />
              <AppText
                variant="caption"
                color={focused ? colors.violet : colors.textTertiary}
                style={[styles.label, focused && styles.labelActive]}
              >
                {config.label}
              </AppText>
              {focused ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_BASE_HEIGHT,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  labelActive: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  dot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
