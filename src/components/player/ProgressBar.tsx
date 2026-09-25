import { StyleSheet, View, Animated, PanResponder, Platform } from 'react-native';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { colors, spacing, borderRadius } from '../../theme';

type ProgressBarProps = Readonly<{
  duration: number;
  position: number;
  onSeek: (sec: number) => void;
  /** While scrubbing or until the player catches up after seek, reports seconds for UI (e.g. time label). */
  onHoldSecondsChange?: (heldSeconds: number | null) => void;
}>;

const TRACK_HEIGHT = 5;
const THUMB_SIZE = 15;
const HIT_HEIGHT = 48;
const IDLE_SYNC_MS = 220;

/**
 * After scrub, `position` from RNTP often lags until `seekTo` completes.
 * `pendingSeekSec` keeps fill + optional parent time label on the released
 * target until live `position` is close enough.
 */
export function ProgressBar({
  duration,
  position,
  onSeek,
  onHoldSecondsChange,
}: ProgressBarProps) {
  const [sliding, setSliding] = useState(false);
  const [localRatio, setLocalRatio] = useState(0);
  const [pendingSeekSec, setPendingSeekSec] = useState<number | null>(null);

  const trackWidthRef = useRef(0);
  const startRatioRef = useRef(0);
  const latestRatioRef = useRef(0);

  const fillRatio = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  const max = Math.max(duration, 0.001);

  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const onHoldRef = useRef(onHoldSecondsChange);
  onHoldRef.current = onHoldSecondsChange;

  useEffect(() => {
    setPendingSeekSec(null);
  }, [duration]);

  useEffect(() => {
    const cb = onHoldRef.current;
    if (!cb) return;
    if (sliding) cb(localRatio * duration);
    else if (pendingSeekSec != null) cb(pendingSeekSec);
    else cb(null);
  }, [sliding, localRatio, duration, pendingSeekSec]);

  useEffect(() => {
    return () => {
      onHoldRef.current?.(null);
    };
  }, []);

  const enterDrag = useCallback(() => {
    Animated.spring(thumbScale, {
      toValue: 1.12,
      useNativeDriver: true,
      friction: 7,
      tension: 220,
    }).start();
  }, [thumbScale]);

  const exitDrag = useCallback(
    (ratio: number) => {
      const d = durationRef.current;
      const targetSec = Math.max(0, Math.min(d, ratio * d));
      setPendingSeekSec(targetSec);
      setSliding(false);
      Animated.spring(thumbScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 200,
      }).start();
      onSeekRef.current(targetSec);
    },
    [thumbScale]
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => durationRef.current > 0,

        onPanResponderGrant: (e) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          setPendingSeekSec(null);
          const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
          startRatioRef.current = ratio;
          latestRatioRef.current = ratio;
          setLocalRatio(ratio);
          fillRatio.setValue(ratio);
          setSliding(true);
          enterDrag();
        },

        onPanResponderMove: (_, gestureState) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          const ratio = Math.max(0, Math.min(1, startRatioRef.current + gestureState.dx / w));
          latestRatioRef.current = ratio;
          setLocalRatio(ratio);
          fillRatio.setValue(ratio);
        },

        onPanResponderRelease: (_, gestureState) => {
          const w = trackWidthRef.current;
          if (w <= 0) {
            exitDrag(latestRatioRef.current);
            return;
          }
          const ratio = Math.max(0, Math.min(1, startRatioRef.current + gestureState.dx / w));
          latestRatioRef.current = ratio;
          exitDrag(ratio);
        },

        onPanResponderTerminate: () => {
          exitDrag(latestRatioRef.current);
        },
      }),
    [fillRatio, enterDrag, exitDrag, setLocalRatio, setSliding]
  );

  useEffect(() => {
    if (sliding) return;

    const maxVal = Math.max(duration, 0.001);

    if (pendingSeekSec != null) {
      const tolerance = Math.max(2, duration * 0.03);
      if (Math.abs(position - pendingSeekSec) <= tolerance) {
        setPendingSeekSec(null);
        const ratio = Math.min(position / maxVal, 1);
        setLocalRatio(ratio);
        Animated.timing(fillRatio, {
          toValue: ratio,
          duration: IDLE_SYNC_MS,
          useNativeDriver: false,
        }).start();
        return;
      }
      const r = Math.min(pendingSeekSec / maxVal, 1);
      setLocalRatio(r);
      fillRatio.setValue(r);
      return;
    }

    const ratio = Math.min(position / maxVal, 1);
    setLocalRatio(ratio);
    Animated.timing(fillRatio, {
      toValue: ratio,
      duration: IDLE_SYNC_MS,
      useNativeDriver: false,
    }).start();
  }, [position, sliding, duration, pendingSeekSec, fillRatio]);

  const fillWidthStyle = {
    width: fillRatio.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
      extrapolate: 'clamp',
    }),
  };

  const a11yNow = Math.floor(
    sliding || pendingSeekSec != null ? localRatio * duration : position
  );

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.hitArea}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Track position"
        accessibilityValue={{
          min: 0,
          max: Math.floor(duration),
          now: a11yNow,
        }}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillWidthStyle]}>
            <Animated.View
              style={[
                styles.thumbWrap,
                { transform: [{ scale: thumbScale }] },
              ]}
              pointerEvents="none"
            >
              <View style={styles.thumb} />
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: spacing[2],
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
    backgroundColor: colors.player.progressTrack,
    overflow: 'visible',
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.player.progressActive,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 4,
      },
      android: { elevation: 0 },
    }),
  },
  thumbWrap: {
    position: 'absolute',
    right: -(THUMB_SIZE / 2),
    top: -(THUMB_SIZE / 2 - TRACK_HEIGHT / 2),
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.text.primary,
    borderWidth: 2,
    borderColor: colors.brand.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },
});
