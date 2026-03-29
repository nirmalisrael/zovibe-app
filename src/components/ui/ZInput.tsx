import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { colors, fonts, fontSize, borderRadius, spacing } from '../../theme';

export function ZInput({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.text.tertiary}
        style={[styles.input, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[4] },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
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
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing[1],
  },
});
