import { View, LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { colors, borderRadius, spacing } from '../../theme';

export function ProgressBar({
  duration,
  position,
  onSeek,
}: {
  duration: number;
  position: number;
  onSeek: (sec: number) => void;
}) {
  const [w, setW] = useState(1);
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setW(e.nativeEvent.layout.width);
  }, []);

  const seekAt = useCallback(
    (x: number) => {
      if (duration <= 0) return;
      const sec = (x / w) * duration;
      onSeek(Math.max(0, Math.min(duration, sec)));
    },
    [duration, w, onSeek]
  );

  return (
    <Pressable onPress={(ev) => seekAt(ev.nativeEvent.locationX)} style={styles.hit}>
      <View style={styles.track} onLayout={onLayout}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { paddingVertical: spacing[2] },
  track: {
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.full,
  },
});
