import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { ReactNode } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { memo } from 'react';
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

function repeatAccessibilityLabel(mode: RepeatMode): string {
  if (mode === 'off') return 'Repeat off';
  if (mode === 'queue') return 'Repeat queue';
  return 'Repeat one track';
}

/** Secondary control: instant press glow only (no Animated). */
const IconButton = memo(function IconButton({
  onPress,
  active,
  accessibilityLabel,
  children,
}: Readonly<{
  onPress: () => void;
  active?: boolean;
  accessibilityLabel: string;
  children: ReactNode;
}>) {
  return (
    <View style={styles.slot}>
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.iconBtn,
          active && styles.iconBtnActive,
          pressed && styles.pressedGlow,
        ]}
      >
        {children}
        {active ? <View style={styles.activeDot} /> : null}
      </Pressable>
    </View>
  );
});

const SkipButton = memo(function SkipButton({
  onPress,
  direction,
}: Readonly<{
  onPress: () => void;
  direction: 'prev' | 'next';
}>) {
  return (
    <View style={styles.slot}>
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={direction === 'prev' ? 'Previous track' : 'Next track'}
        style={({ pressed }) => [styles.skipHit, pressed && styles.pressedGlow]}
      >
        <Ionicons
          name={direction === 'prev' ? 'play-skip-back' : 'play-skip-forward'}
          size={28}
          color={colors.text.primary}
        />
      </Pressable>
    </View>
  );
});

const PLAY_SIZE = 64;

export const PlayerControls = memo(function PlayerControls({
  isPlaying,
  shuffle,
  repeat,
  onPrev,
  onNext,
  onTogglePlay,
  onShuffle,
  onRepeat,
}: Props) {
  const repeatActive = repeat === 'queue' || repeat === 'track';

  return (
    <View style={styles.row}>
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

      <SkipButton onPress={onPrev} direction="prev" />

      <View style={styles.slot}>
        <Pressable
          onPress={onTogglePlay}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={({ pressed }) => [styles.playBtn, pressed && styles.playPressed]}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={30}
            color={colors.text.inverse}
            style={isPlaying ? undefined : styles.playIconOffset}
          />
        </Pressable>
      </View>

      <SkipButton onPress={onNext} direction="next" />

      <IconButton
        onPress={onRepeat}
        active={repeatActive}
        accessibilityLabel={repeatAccessibilityLabel(repeat)}
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
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: spacing[1],
    marginVertical: spacing[5],
    gap: spacing[1],
  },
  /** Equal columns so play stays visually centered. */
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },

  pressedGlow: {
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
  },

  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    position: 'relative',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.28)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.light,
  },

  skipHit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },

  playBtn: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  playPressed: {
    backgroundColor: '#6D28D9',
    borderColor: 'rgba(237, 233, 254, 0.45)',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.55,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  playIconOffset: {
    marginLeft: 4,
  },

  repeatOneBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  repeatOneTxt: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.inverse,
    marginTop: Platform.OS === 'android' ? 0 : -0.5,
  },
});
