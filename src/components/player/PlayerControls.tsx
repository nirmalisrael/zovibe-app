import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useCallback } from 'react';
import { colors, spacing, borderRadius } from '../../theme';
import type { RepeatMode } from '../../store/playerStore';

type Props = Readonly<{
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
}>;

// ─── Shared spring configs ────────────────────────────────────────────────────
const SPRING_IN = { toValue: 0.82, useNativeDriver: true, friction: 5, tension: 300 } as const;
const SPRING_OUT = { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 } as const;

// ─── Secondary icon button (shuffle / repeat) ─────────────────────────────────
function IconButton({
  onPress,
  active,
  accessibilityLabel,
  children,
}: Readonly<{
  onPress: () => void;
  active?: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
}>) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { ...SPRING_IN, toValue: 0.82 }),
      Animated.timing(opacity, { toValue: 0.7, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, SPRING_OUT),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.iconBtn,
          active && styles.iconBtnActive,
          { transform: [{ scale }], opacity },
        ]}
      >
        {children}
        {active && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  );
}

// ─── Skip buttons (prev / next) ───────────────────────────────────────────────
function SkipButton({
  onPress,
  direction,
}: Readonly<{
  onPress: () => void;
  direction: 'prev' | 'next';
}>) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { ...SPRING_IN, toValue: 0.86 }),
      Animated.timing(opacity, { toValue: 0.65, duration: 70, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, SPRING_OUT),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Previous track' : 'Next track'}
    >
      <Animated.View style={[styles.skipWrap, { transform: [{ scale }], opacity }]}>
        <Ionicons
          name={direction === 'prev' ? 'play-skip-back' : 'play-skip-forward'}
          size={30}
          color={colors.text.primary}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function PlayerControls({
  isPlaying,
  shuffle,
  repeat,
  onPrev,
  onNext,
  onTogglePlay,
  onShuffle,
  onRepeat,
}: Props) {
  const playScale = useRef(new Animated.Value(1)).current;
  const playRing = useRef(new Animated.Value(0)).current;   // ripple expand

  const pressIn = useCallback(() => {
    Animated.spring(playScale, { ...SPRING_IN, toValue: 0.90 }).start();
  }, [playScale]);

  const pressOut = useCallback(() => {
    Animated.spring(playScale, SPRING_OUT).start();
  }, [playScale]);

  // Subtle ripple on tap: ring expands from 58 → 74 and fades
  const triggerRipple = useCallback(() => {
    playRing.setValue(0);
    Animated.timing(playRing, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
    onTogglePlay();
  }, [playRing, onTogglePlay]);

  const ringScale = playRing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const ringOpacity = playRing.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.2, 0] });

  return (
    <View style={styles.row}>

      {/* ── Shuffle ── */}
      <IconButton
        onPress={onShuffle}
        active={shuffle}
        accessibilityLabel={shuffle ? 'Shuffle on' : 'Shuffle off'}
      >
        <Ionicons
          name="shuffle"
          size={22}
          color={shuffle ? colors.brand.light : colors.text.tertiary}
        />
      </IconButton>

      {/* ── Previous ── */}
      <SkipButton onPress={onPrev} direction="prev" />

      {/* ── Play / Pause ── */}
      <View style={styles.playOuter}>
        {/* Ripple ring */}
        <Animated.View
          style={[
            styles.rippleRing,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
          pointerEvents="none"
        />
        <Pressable
          onPress={triggerRipple}
          onPressIn={pressIn}
          onPressOut={pressOut}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Animated.View
            style={[styles.playBtn, { transform: [{ scale: playScale }] }]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color={colors.text.inverse}
              style={!isPlaying ? styles.playIconOffset : undefined}
            />
          </Animated.View>
        </Pressable>
      </View>

      {/* ── Next ── */}
      <SkipButton onPress={onNext} direction="next" />

      {/* ── Repeat ── */}
      <IconButton
        onPress={onRepeat}
        active={repeat === 'queue' || repeat === 'track'}
        accessibilityLabel={`Repeat: ${repeat}`}
      >
        <Ionicons
          name={repeat === 'off' ? 'repeat-outline' : 'repeat'}
          size={22}
          color={repeat === 'off' ? colors.text.tertiary : colors.brand.light}
        />
        {repeat === 'track' ? (
          <View style={styles.repeatOneBadge} pointerEvents="none">
            <Text style={styles.repeatOneTxt}>1</Text>
          </View>
        ) : null}
      </IconButton>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const PLAY_SIZE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    marginVertical: spacing[4],
  },

  /* ── Secondary icon buttons ── */
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    position: 'relative',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.light,
  },

  /* ── Skip buttons ── */
  skipWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },

  /* ── Play button ── */
  playOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.brand.light,
  },
  playBtn: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
      },
      android: { elevation: 10 },
    }),
  },
  playIconOffset: {
    marginLeft: 3,
  },

  /* ── Repeat-one badge ── */
  repeatOneBadge: {
    position: 'absolute',
    top: 5,
    right: 3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  repeatOneTxt: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.inverse,
    marginTop: Platform.OS === 'android' ? 0 : -0.5,
  },
});