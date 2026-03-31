import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, layout } from '../../theme';

/** Shimmer band width (px) — narrow highlight that sweeps across the bone */
const SHIMMER_BAND = 96;
/** Slightly longer + linear easing reads like a steady “scan” (common in modern UIs) */
const SHIMMER_DURATION_MS = 1650;

const skeleton = {
  /** Slightly lifted from flat bg so blocks read as “material” */
  base: '#221A42',
  baseMuted: '#1A1530',
  rim: 'rgba(199, 181, 253, 0.08)',
  /** Peak highlight — brand pale, controlled opacity */
  glow: 'rgba(237, 233, 254, 0.22)',
  glowMid: 'rgba(196, 181, 253, 0.14)',
} as const;

const SHIMMER_GRADIENT = [
  'transparent',
  skeleton.glowMid,
  skeleton.glow,
  skeleton.glowMid,
  'transparent',
] as const;

function ShimmerBone({
  width,
  height,
  radius = borderRadius.md,
  style,
  staggerDelay = 0,
  variant = 'default',
}: Readonly<{
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: object;
  /** Delays shimmer start so rows feel like a soft wave */
  staggerDelay?: number;
  variant?: 'default' | 'muted' | 'onCard';
}>) {
  const [layoutW, setLayoutW] = useState(0);
  const translateX = useSharedValue(-SHIMMER_BAND);

  const baseByVariant: Record<typeof variant, string> = {
    default: skeleton.base,
    muted: skeleton.baseMuted,
    onCard: colors.bg.tertiary,
  };
  const baseBg = baseByVariant[variant];

  useEffect(() => {
    if (layoutW < 12) return;
    cancelAnimation(translateX);
    translateX.value = -SHIMMER_BAND;
    const endX = layoutW + SHIMMER_BAND;
    translateX.value = withDelay(
      staggerDelay,
      withRepeat(
        withTiming(endX, {
          duration: SHIMMER_DURATION_MS,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
    return () => cancelAnimation(translateX);
  }, [layoutW, staggerDelay, translateX]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - layoutW) > 0.5) setLayoutW(w);
  };

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: baseBg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: skeleton.rim,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {layoutW >= 12 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: SHIMMER_BAND,
              left: 0,
            },
            shimmerStyle,
          ]}
        >
          <LinearGradient
            colors={[...SHIMMER_GRADIENT]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function SongRowSkeleton({ staggerIndex = 0 }: Readonly<{ staggerIndex?: number }>) {
  const d = staggerIndex * 48;
  return (
    <View style={styles.songRow}>
      <ShimmerBone width={44} height={44} radius={borderRadius.sm} staggerDelay={d} />
      <View style={styles.songMeta}>
        <ShimmerBone width="88%" height={13} radius={6} staggerDelay={d + 20} />
        <ShimmerBone width="52%" height={11} radius={5} style={{ marginTop: 6 }} staggerDelay={d + 35} variant="muted" />
      </View>
    </View>
  );
}

export function HomeFeedSkeleton() {
  return (
    <View style={styles.homeWrap}>
      <ShimmerBone width={148} height={13} radius={7} style={{ marginBottom: spacing[4] }} />
      <View style={styles.carousel}>
        {[0, 1, 2].map((i) => (
          <ShimmerBone key={i} width={132} height={172} radius={borderRadius.lg} staggerDelay={i * 70} />
        ))}
      </View>
      <ShimmerBone width={128} height={13} radius={7} style={{ marginTop: spacing[6], marginBottom: spacing[3] }} />
      <View style={styles.carousel}>
        {[0, 1, 2].map((i) => (
          <ShimmerBone
            key={i}
            width={132}
            height={172}
            radius={borderRadius.lg}
            staggerDelay={80 + i * 70}
          />
        ))}
      </View>
      <ShimmerBone width={108} height={15} radius={7} style={{ marginTop: spacing[6], marginBottom: spacing[3] }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <SongRowSkeleton key={i} staggerIndex={i} />
      ))}
    </View>
  );
}

export function AlbumDetailSkeleton() {
  return (
    <View style={styles.detailPad}>
      <ShimmerBone width={40} height={40} radius={borderRadius.full} style={{ marginBottom: spacing[2] }} />
      <ShimmerBone width={184} height={184} radius={borderRadius.xl} style={{ marginTop: spacing[2] }} />
      <ShimmerBone width="90%" height={26} radius={9} style={{ marginTop: spacing[4] }} />
      <ShimmerBone width="48%" height={14} radius={7} style={{ marginTop: spacing[3] }} variant="muted" />
      <View style={styles.playlistActions}>
        <ShimmerBone width={112} height={42} radius={borderRadius.md} />
        <ShimmerBone width={112} height={42} radius={borderRadius.md} />
      </View>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SongRowSkeleton key={i} staggerIndex={i} />
      ))}
    </View>
  );
}

export function ArtistDetailSkeleton() {
  return (
    <View style={styles.detailPad}>
      <ShimmerBone width={40} height={40} radius={borderRadius.full} style={{ marginBottom: spacing[4] }} />
      <ShimmerBone width="72%" height={30} radius={10} style={{ marginBottom: spacing[2] }} />
      <ShimmerBone width={112} height={14} radius={7} style={{ marginBottom: spacing[4] }} variant="muted" />
      <View style={styles.carousel}>
        {[0, 1].map((i) => (
          <View key={i} style={{ width: 280 }}>
            <SongRowSkeleton staggerIndex={i} />
          </View>
        ))}
      </View>
      <ShimmerBone width={96} height={14} radius={7} style={{ marginVertical: spacing[4] }} />
      <View style={styles.carousel}>
        {[0, 1, 2].map((i) => (
          <ShimmerBone key={i} width={124} height={124} radius={borderRadius.lg} staggerDelay={i * 60} />
        ))}
      </View>
    </View>
  );
}

export function PlaylistDetailSkeleton() {
  return (
    <View style={styles.detailPad}>
      <ShimmerBone width={40} height={40} radius={borderRadius.full} style={{ marginBottom: spacing[2] }} />
      <ShimmerBone width="78%" height={26} radius={9} style={{ marginBottom: spacing[4] }} />
      <View style={styles.playlistActions}>
        <ShimmerBone width={104} height={42} radius={borderRadius.md} />
        <ShimmerBone width={104} height={42} radius={borderRadius.md} />
      </View>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <SongRowSkeleton key={i} staggerIndex={i} />
      ))}
    </View>
  );
}

export function LibraryPlaylistSkeleton() {
  return (
    <View style={{ paddingHorizontal: layout.screenPadding, gap: spacing[3] }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.playlistCard}>
          <ShimmerBone width={56} height={56} radius={borderRadius.md} staggerDelay={i * 50} variant="onCard" />
          <View style={{ flex: 1, marginLeft: spacing[3] }}>
            <ShimmerBone width="72%" height={17} radius={7} staggerDelay={i * 50 + 25} variant="onCard" />
            <ShimmerBone
              width="42%"
              height={12}
              radius={6}
              style={{ marginTop: 10 }}
              variant="onCard"
              staggerDelay={i * 50 + 40}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const LYRIC_LINE_WIDTHS: readonly `${number}%`[] = ['100%', '92%', '78%'];

export function LyricsSheetSkeleton() {
  return (
    <View style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing[4], paddingBottom: spacing[8] }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <ShimmerBone
          key={i}
          width={LYRIC_LINE_WIDTHS[i % 3]}
          height={14}
          radius={7}
          style={{ marginBottom: spacing[3] }}
          staggerDelay={i * 40}
          variant="muted"
        />
      ))}
    </View>
  );
}

export function SearchResultsSkeleton() {
  return (
    <View style={{ paddingBottom: spacing[8] }}>
      <ShimmerBone width={88} height={15} radius={7} style={{ marginBottom: spacing[3] }} />
      {[0, 1, 2, 3].map((i) => (
        <SongRowSkeleton key={i} staggerIndex={i} />
      ))}
      <ShimmerBone width={76} height={15} radius={7} style={{ marginTop: spacing[4], marginBottom: spacing[3] }} />
      <View style={styles.carousel}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerBone key={i} width={116} height={116} radius={borderRadius.lg} staggerDelay={i * 55} />
        ))}
      </View>
      <ShimmerBone width={64} height={15} radius={7} style={{ marginTop: spacing[4], marginBottom: spacing[3] }} />
      <View style={styles.carousel}>
        {[0, 1, 2].map((i) => (
          <ShimmerBone key={i} width={100} height={100} radius={borderRadius.full} staggerDelay={120 + i * 55} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  homeWrap: {
    marginTop: spacing[2],
  },
  carousel: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  songMeta: {
    flex: 1,
    marginLeft: spacing[3],
    gap: 2,
  },
  detailPad: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[2],
  },
  playlistActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
});
