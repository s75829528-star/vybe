import { ScrollView, StyleSheet, Pressable } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { hapticSelection } from '@/lib/haptics';
import { colors, radii, spacing } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  scrollable = true,
}: Props<T>) {
  const content = (
    <Pressable style={styles.group} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) {
                hapticSelection();
                onChange(option.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.item,
              selected && styles.itemSelected,
              pressed && !selected && { opacity: 0.65 },
            ]}
          >
            <AppText
              variant="smallBold"
              color={selected ? colors.text : colors.textSecondary}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </Pressable>
  );

  if (!scrollable) return content;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  group: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 2,
  },
  item: {
    height: 34,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
