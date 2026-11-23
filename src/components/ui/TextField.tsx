import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, fonts, radii, spacing } from '@/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  containerStyle?: StyleProp<ViewStyle>;
  secure?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, icon, containerStyle, secure, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="captionBold" style={styles.label} color={colors.textSecondary}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.violet : colors.textTertiary}
          />
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          secureTextEntry={secure ? hidden : false}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            rest.style,
            { fontFamily: fonts.regular },
          ]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={19}
              color={colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.helper}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.textTertiary} style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
  field: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  fieldMultiline: {
    minHeight: 108,
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  fieldFocused: {
    borderColor: 'rgba(192,132,252,0.7)',
    backgroundColor: colors.surfaceHigh,
  },
  fieldError: {
    borderColor: 'rgba(251,113,133,0.65)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  helper: {
    marginTop: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
});
