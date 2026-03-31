import { StyleSheet, View, Animated, PanResponder } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { colors, spacing, borderRadius } from '../../theme';

type ProgressBarProps = Readonly<{
  duration: number;
  position: number;
  onSeek: (sec: number) => void;
}>;

/**
 * Custom scrubber — replaces @react-native-community/slider for full design
 * control. Uses a PanResponder on the track so the hit target is the entire
 * bar height (44 px) rather than the tiny thumb. Thumb animates in on touch
 * and shows a dragging state with an expanded glow ring.
 */
export function ProgressBar({ duration, position, onSeek }: ProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [localRatio, setLocalRatio] = useState(0);

  // Animated values
  const fillRatio = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const max = Math.max(duration, 0.001);

  // Keep fill synced with playback when not scrubbing
  useEffect(() => {
    if (!sliding) {
      const ratio = Math.min(position / max, 1);
      setLocalRatio(ratio);
      Animated.timing(fillRatio, {
        toValue: ratio,
        duration: 500,
        useNativeDriver: false,   // width % cannot use native driver
      }).start();
    }
  }, [position, sliding, max]);

  const enterDrag = useCallback(() => {
    setSliding(true);
    Animated.parallel([
      Animated.spring(thumbScale, { toValue: 1.35, useNativeDriver: true, friction: 5 }),
      Animated.timing(ringScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [thumbScale, ringScale, ringOpacity]);

  const exitDrag = useCallback((ratio: number) => {
    setSliding(false);
    Animated.parallel([
      Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(ringScale, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
    onSeek(Math.max(0, Math.min(duration, ratio * duration)));
  }, [thumbScale, ringScale, ringOpacity, onSeek, duration]);

  const clampRatio = (x: number) =>
    Math.max(0, Math.min(1, trackWidth > 0 ? x / trackWidth : 0));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => duration > 0,
      onMoveShouldSetPanResponder: () => duration > 0,
      onPanResponderGrant: (e) => {
        const ratio = clampRatio(e.nativeEvent.locationX);
        setLocalRatio(ratio);
        fillRatio.setValue(ratio);
        enterDrag();
      },
      onPanResponderMove: (e) => {
        const ratio = clampRatio(e.nativeEvent.locationX);
        setLocalRatio(ratio);
        fillRatio.setValue(ratio);
      },
      onPanResponderRelease: (e) => {
        const ratio = clampRatio(e.nativeEvent.locationX);
        exitDrag(ratio);
      },
      onPanResponderTerminate: () => exitDrag(localRatio),
    })
  ).current;

  const fillWidthStyle = {
    width: fillRatio.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
      extrapolate: 'clamp',
    }),
  };

  return (
    <View style={styles.wrapper}>
      {/* ── Hit area + track ── */}
      <View
        style={styles.hitArea}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Track position"
        accessibilityValue={{
          min: 0,
          max: Math.floor(duration),
          now: Math.floor(sliding ? localRatio * duration : position),
        }}
      >
        {/* Track background */}
        <View style={styles.track}>
          {/* Buffered ghost (subtle, decorative) */}
          <View style={[styles.buffered, { width: '85%' }]} />

          {/* Filled portion */}
          <Animated.View style={[styles.fill, fillWidthStyle]}>
            {/* Thumb */}
            <Animated.View
              style={[
                styles.thumbContainer,
                { transform: [{ scale: thumbScale }] },
              ]}
              pointerEvents="none"
            >
              {/* Glow ring (drag state) */}
              <Animated.View
                style={[
                  styles.thumbRing,
                  {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                  },
                ]}
              />
              {/* Thumb dot */}
              <View style={styles.thumb} />
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 14;
const RING_SIZE = 28;
const HIT_HEIGHT = 44;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: spacing[1],
  },
  hitArea: {
    width: '100%',
    height: HIT_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'visible',
  },
  buffered: {
    position: 'absolute',
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.brand.primary,
    overflow: 'visible',
    // Subtle gloss on fill
    shadowColor: colors.brand.light,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  thumbContainer: {
    position: 'absolute',
    right: -(THUMB_SIZE / 2),
    top: -(THUMB_SIZE / 2 - TRACK_HEIGHT / 2),
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.text.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});