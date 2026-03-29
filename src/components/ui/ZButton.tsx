import {
  Pressable,
  Text,
  type PressableProps,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSize, borderRadius, spacing } from '../../theme';

type Variant = 'primary' | 'ghost' | 'icon';

export function ZButton({
  title,
  variant = 'primary',
  loading,
  style,
  disabled,
  children,
  ...rest
}: PressableProps & {
  title?: string;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const isGhost = variant === 'ghost';
  const isIcon = variant === 'icon';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isGhost && styles.ghost,
        !isGhost && !isIcon && styles.primary,
        isIcon && styles.icon,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.brand.light : colors.text.inverse} />
      ) : title && !isIcon ? (
        <Text style={[styles.label, isGhost && styles.labelGhost]}>{title}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
  },
  primary: {
    backgroundColor: colors.brand.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  icon: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.full,
    minWidth: 44,
    minHeight: 44,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.base,
    color: colors.text.inverse,
  },
  labelGhost: { color: colors.brand.light },
});
