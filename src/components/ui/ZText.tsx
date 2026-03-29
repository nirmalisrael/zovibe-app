import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { colors, fonts, fontSize } from '../../theme';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'brand';

const variantStyle: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text.primary },
  subtitle: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text.secondary },
  body: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.text.primary },
  caption: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.tertiary },
  brand: { fontFamily: fonts.light, fontSize: fontSize['4xl'], color: colors.brand.light },
};

export function ZText({
  variant = 'body',
  style,
  children,
  ...rest
}: TextProps & { variant?: Variant }) {
  return (
    <Text style={[variantStyle[variant], style]} {...rest}>
      {children}
    </Text>
  );
}
