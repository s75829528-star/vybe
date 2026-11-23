import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '@/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
  padded?: boolean;
}>;

export function Screen({ children, style, edges = ['top'], padded = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        padded && { paddingHorizontal: layout.screenPadding },
        {
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
