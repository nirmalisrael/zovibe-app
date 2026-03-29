import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius } from '../../theme';

export function SkeletonBlock({
  width,
  height,
  radius = borderRadius.md,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  const o = useSharedValue(0.35);

  useEffect(() => {
    o.value = withRepeat(withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);

  const style = useAnimatedStyle(() => ({
    opacity: o.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bg.tertiary,
  },
});
