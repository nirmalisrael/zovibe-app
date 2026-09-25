import React from 'react';
import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';

export type BlurTint = 'light' | 'dark' | 'default';

export interface BlurViewProps extends ViewProps {
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const BlurView: React.FC<BlurViewProps> = ({
  intensity = 50,
  tint = 'dark',
  style,
  children,
  ...rest
}) => {
  const alpha = Math.min(Math.max((intensity || 50) / 100, 0.2), 0.95);
  const backgroundColor =
    tint === 'light'
      ? `rgba(255, 255, 255, ${alpha * 0.7})`
      : `rgba(18, 18, 30, ${alpha * 0.88})`;

  return (
    <View style={[{ backgroundColor }, style]} {...rest}>
      {children}
    </View>
  );
};

export default BlurView;
