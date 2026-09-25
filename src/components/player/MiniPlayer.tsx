import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  type DimensionValue,
} from 'react-native';
import { BlurView } from '../ui/BlurView';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { useProgress } from 'react-native-track-player';
import { usePlayerStore } from '../../store/playerStore';
import { usePlayer } from '../../hooks/usePlayer';
import { CoverImage } from '../ui/CoverImage';
import { PlayingWaveIndicator } from '../ui/PlayingWaveIndicator';
import { getPrimaryArtistNames } from '../../utils/songHelpers';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

type MiniPlayerProps = Readonly<{
  onExpand: () => void;
  /** Swipe down: hide mini player and stop playback */
  onSwipeDismiss?: () => void;
}>;

type CtrlBtnProps = PropsWithChildren<
  Readonly<{
    label: string;
    /** RNTP helpers are async; allow Promise so props are not inferred as `any` */
    onPress: () => void | Promise<void>;
  }>
>;

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({ onPress, label, children }: CtrlBtnProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, friction: 5 }),
      Animated.timing(opacity, { toValue: 0.6, duration: 60, useNativeDriver: true }),
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.ctrlBtn, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function MiniPlayer({ onExpand, onSwipeDismiss }: MiniPlayerProps) {
  const queue = usePlayerStore((s) => s.queue);
  const current = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  /** Live from RNTP — store `progress` is never synced; mini stays mounted in tab bar while browsing */
  const { position, duration } = useProgress(320);

  const { togglePlay, skipToNext, skipToPrevious } = usePlayer();

  const swipeDismissRef = useRef(onSwipeDismiss);
  swipeDismissRef.current = onSwipeDismiss;

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Boolean(swipeDismissRef.current) && g.dy > 12 && g.dy > Math.abs(g.dx) * 1.15,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, g) => {
        const fn = swipeDismissRef.current;
        if (!fn) return;
        if (g.dy > 56 || g.vy > 1.25) fn();
      },
    })
  ).current;

  const playScale = useRef(new Animated.Value(1)).current;
  const playPressIn = () =>
    Animated.spring(playScale, { toValue: 0.88, useNativeDriver: true, friction: 5 }).start();
  const playPressOut = () =>
    Animated.spring(playScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

  const progressRatio =
    duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;
  const progressWidth = `${Math.round(progressRatio * 100)}%` as DimensionValue;

  if (!queue.length || !current) return null;

  const art = current.image?.at(-1)?.url;

  return (
    <View style={styles.card} {...(onSwipeDismiss ? swipePan.panHandlers : {})}>
      <BlurView intensity={Platform.OS === 'ios' ? 52 : 88} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.overlay} pointerEvents="none" />

      <View style={styles.inner}>
        <View style={styles.row}>
          <Pressable
            style={styles.expand}
            onPress={onExpand}
            accessibilityRole="button"
            accessibilityLabel={`Now playing: ${current.name}. Open full player`}
          >
            <View style={styles.thumbWrap}>
              <CoverImage uri={art} size={46} radius={borderRadius.md} />
              <View style={styles.thumbSheen} pointerEvents="none" />
            </View>

            <View style={styles.metaWrap}>
              <PlayingWaveIndicator active={isPlaying} />

              <View style={styles.metaText}>
                <Text style={styles.title} numberOfLines={1}>
                  {current.name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {getPrimaryArtistNames(current)}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.controls}>
            <CtrlBtn onPress={skipToPrevious} label="Previous track">
              <Ionicons name="play-skip-back" size={18} color={colors.text.secondary} />
            </CtrlBtn>

            <Pressable
              onPress={togglePlay}
              onPressIn={playPressIn}
              onPressOut={playPressOut}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Animated.View
                style={[styles.playBtn, { transform: [{ scale: playScale }] }]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color={colors.text.primary}
                  style={!isPlaying && styles.playIconOffset}
                />
              </Animated.View>
            </Pressable>

            <CtrlBtn onPress={skipToNext} label="Next track">
              <Ionicons name="play-skip-forward" size={18} color="rgba(220,210,255,0.65)" />
            </CtrlBtn>
          </View>
        </View>

        {/* Progress flush with bottom edge (sits directly above tab bar when embedded) */}
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border.default,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.player.bg,
  },

  inner: {
    position: 'relative',
  },

  progressTrack: {
    height: 3,
    backgroundColor: colors.player.progressTrack,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.player.progressActive,
    borderRadius: 1.5,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[2] + 1,
    paddingBottom: spacing[2],
    paddingLeft: spacing[2],
    paddingRight: spacing[2],
    gap: spacing[2],
  },

  expand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: spacing[2] + 2,
  },

  thumbWrap: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },

  metaWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: spacing[2],
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    letterSpacing: -0.15,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 2,
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  playBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.brand.primary,
    borderWidth: 0.5,
    borderColor: 'rgba(167, 139, 250, 0.45)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  playIconOffset: {
    marginLeft: 2,
  },
});
