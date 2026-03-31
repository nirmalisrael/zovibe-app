import { forwardRef, useState, useCallback } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Pressable,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSize, borderRadius, spacing } from '../../theme';

export type ZInputProps = TextInputProps & {
  label?: string;
  error?: string;
  compact?: boolean;
  /** When `secureTextEntry` is true, show eye toggle (set false to disable). */
  passwordToggle?: boolean;
};

export const ZInput = forwardRef<TextInput, ZInputProps>(function ZInput(
  { label, error, compact, style, secureTextEntry, passwordToggle = true, ...rest },
  ref
) {
  const [passwordHidden, setPasswordHidden] = useState(true);
  const showToggle = Boolean(secureTextEntry && passwordToggle);
  const effectiveSecure = showToggle ? passwordHidden : Boolean(secureTextEntry);

  const togglePassword = useCallback(() => {
    setPasswordHidden((h) => !h);
  }, []);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputShell}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.input,
            compact && styles.inputCompact,
            showToggle && styles.inputWithToggle,
            style,
          ]}
          secureTextEntry={effectiveSecure}
          {...rest}
        />
        {showToggle ? (
          <Pressable
            onPress={togglePassword}
            style={({ pressed }) => [styles.toggleBtn, pressed && styles.togglePressed]}
            accessibilityRole="button"
            accessibilityLabel={passwordHidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
          >
            <Ionicons
              name={passwordHidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[4] },
  wrapCompact: { marginBottom: spacing[2] },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  inputShell: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  inputCompact: {
    paddingVertical: spacing[2],
  },
  inputWithToggle: {
    paddingRight: spacing[4] + 36,
  },
  toggleBtn: {
    position: 'absolute',
    right: spacing[2],
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePressed: { opacity: 0.65 },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing[1],
  },
});
