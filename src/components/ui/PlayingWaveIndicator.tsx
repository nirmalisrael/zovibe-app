import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme';

type Props = Readonly<{
  /** When true, bars pulse like SongRow “now playing”; when false, collapse smoothly */
  active: boolean;
}>;

/** Same animation + styling as SongRow’s playing indicator (Reanimated, UI-thread). */
export function PlayingWaveIndicator({ active }: Props) {
  const bar1 = useSharedValue(4);
  const bar2 = useSharedValue(8);
  const bar3 = useSharedValue(6);

  useEffect(() => {
    if (active) {
      bar1.value = withRepeat(
        withTiming(14, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      bar2.value = withRepeat(
        withTiming(18, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      bar3.value = withRepeat(
        withTiming(12, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      return;
    }

    cancelAnimation(bar1);
    cancelAnimation(bar2);
    cancelAnimation(bar3);

    bar1.value = withTiming(4);
    bar2.value = withTiming(6);
    bar3.value = withTiming(5);
  }, [active]);

  const barStyle1 = useAnimatedStyle(() => ({ height: bar1.value }));
  const barStyle2 = useAnimatedStyle(() => ({ height: bar2.value }));
  const barStyle3 = useAnimatedStyle(() => ({ height: bar3.value }));

  return (
    <View style={styles.waveContainer}>
      <Animated.View style={[styles.bar, barStyle1]} />
      <Animated.View style={[styles.bar, barStyle2]} />
      <Animated.View style={[styles.bar, barStyle3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
  },
  bar: {
    width: 2,
    backgroundColor: colors.brand.primary,
    borderRadius: 1,
  },
});
