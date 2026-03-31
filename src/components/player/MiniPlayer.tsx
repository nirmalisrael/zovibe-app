import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { usePlayer } from '../../hooks/usePlayer';
import { CoverImage } from '../ui/CoverImage';
import { getPrimaryArtistNames } from '../../utils/songHelpers';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

type MiniPlayerProps = Readonly<{ onExpand: () => void }>;

// ─── Animated waveform bar ────────────────────────────────────────────────────
function WaveBar({
  isPlaying,
  delay,
  minH,
  maxH,
}: {
  isPlaying: boolean;
  delay: number;
  minH: number;
  maxH: number;
}) {
  const anim = useRef(new Animated.Value(minH)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxH,
            duration: 320 + delay * 60,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minH,
            duration: 320 + delay * 60,
            useNativeDriver: false,
          }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(anim, {
        toValue: minH,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    return () => loopRef.current?.stop();
  }, [isPlaying]);

  return (
    <Animated.View
      style={{
        width: 3,
        height: anim,
        borderRadius: 2,
        backgroundColor: colors.brand.light,
        marginHorizontal: 1.5,
      }}
    />
  );
}

// ─── Waveform indicator (3 bars) ──────────────────────────────────────────────
function Waveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <View style={waveStyles.row}>
      <WaveBar isPlaying={isPlaying} delay={0} minH={4} maxH={12} />
      <WaveBar isPlaying={isPlaying} delay={1} minH={6} maxH={16} />
      <WaveBar isPlaying={isPlaying} delay={2} minH={3} maxH={10} />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    marginRight: spacing[2],
  },
});

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, friction: 5 }),
      Animated.timing(opacity, { toValue: 0.6, duration: 60, useNativeDriver: true }),
    ]).start();
  }, []);
  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, []);

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
export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const queue = usePlayerStore((s) => s.queue);
  const current = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);    // 0–1

  const { togglePlay, skipToNext, skipToPrevious } = usePlayer();

  // Mount animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  // Play button scale
  const playScale = useRef(new Animated.Value(1)).current;
  const playPressIn = useCallback(() =>
    Animated.spring(playScale, { toValue: 0.88, useNativeDriver: true, friction: 5 }).start(), []);
  const playPressOut = useCallback(() =>
    Animated.spring(playScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start(), []);

  useEffect(() => {
    if (queue.length && current) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [current?.id]);

  if (!queue.length || !current) return null;

  const art = current.image?.at(-1)?.url;
  const progressPct = `${Math.round(Math.min((progress ?? 0), 1) * 100)}%` as `${number}%`;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* ── Glass background ── */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 52 : 100}
        tint="dark"
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Deep overlay for contrast ── */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* ── Accent gradient strip (top edge) ── */}
      <View style={styles.accentEdge} pointerEvents="none" />

      <View style={styles.inner}>
        {/* ── Progress bar (full width, sits at top of content) ── */}
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: progressPct }]} />
        </View>

        {/* ── Main row ── */}
        <View style={styles.row}>

          {/* Thumbnail + meta — tapping expands player */}
          <Pressable
            style={styles.expand}
            onPress={onExpand}
            accessibilityRole="button"
            accessibilityLabel={`Now playing: ${current.name}. Open full player`}
          >
            <View style={styles.thumbWrap}>
              <CoverImage uri={art} size={46} radius={borderRadius.md} />
              {/* Sheen overlay */}
              <View style={styles.thumbSheen} pointerEvents="none" />
            </View>

            <View style={styles.metaWrap}>
              {/* Live waveform indicator */}
              <Waveform isPlaying={isPlaying} />

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

          {/* Controls */}
          <View style={styles.controls}>
            <CtrlBtn onPress={skipToPrevious} label="Previous track">
              <Ionicons name="play-skip-back" size={18} color="rgba(220,210,255,0.65)" />
            </CtrlBtn>

            {/* Play / Pause */}
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
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(180, 160, 255, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#050214',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 5, 28, 0.74)',
  },

  accentEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
  },

  inner: {
    position: 'relative',
  },

  /* ── Progress ── */
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.light,
    borderRadius: 1.5,
    // Subtle glow
    shadowColor: colors.brand.light,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  /* ── Row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2] + 2,
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

  /* ── Thumbnail ── */
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

  /* ── Meta (waveform + text) ── */
  metaWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
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
    color: 'rgba(200, 185, 255, 0.42)',
  },

  /* ── Controls ── */
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
    backgroundColor: 'rgba(124, 58, 237, 0.42)',
    borderWidth: 0.5,
    borderColor: 'rgba(167, 139, 250, 0.35)',
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