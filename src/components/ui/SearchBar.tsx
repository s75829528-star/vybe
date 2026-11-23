import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search songs, artists, albums…',
  onSubmit,
  autoFocus,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={19} color={value ? colors.violet : colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={19} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
});
