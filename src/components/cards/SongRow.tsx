import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { JioSaavnSong } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { LanguageBadge } from '../ui/LanguageBadge';
import { formatTime } from '../../utils/formatTime';
import { getPrimaryArtistNames } from '../../utils/songHelpers';
import { usePlayerStore } from '../../store/playerStore';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

type SongRowProps = Readonly<{
  song: JioSaavnSong;
  index?: number;
  onPress: () => void;
  onToggleLike?: () => void;
  liked?: boolean;
  showLike?: boolean;
  onLongPress?: () => void;
}>;

export function SongRow({
  song,
  index,
  onPress,
  onToggleLike,
  liked,
  showLike = true,
  onLongPress,
}: SongRowProps) {
  const artist = getPrimaryArtistNames(song);
  const currentSongId = usePlayerStore((s) => s.currentSong?.id);
  const isPlayerRunning = usePlayerStore((s) => s.isPlaying);
  const isNowPlaying = currentSongId === song.id;

  // 🎵 Wave bars animation values
  const bar1 = useSharedValue(4);
  const bar2 = useSharedValue(8);
  const bar3 = useSharedValue(6);

  useEffect(() => {
    if (isNowPlaying && isPlayerRunning) {
      bar1.value = withRepeat(withTiming(14, { duration: 400, easing: Easing.inOut(Easing.ease) }), -1, true);
      bar2.value = withRepeat(withTiming(18, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true);
      bar3.value = withRepeat(withTiming(12, { duration: 450, easing: Easing.inOut(Easing.ease) }), -1, true);
      return;
    }

    cancelAnimation(bar1);
    cancelAnimation(bar2);
    cancelAnimation(bar3);

    bar1.value = withTiming(4);
    bar2.value = withTiming(6);
    bar3.value = withTiming(5);
  }, [isNowPlaying, isPlayerRunning]);

  const barStyle1 = useAnimatedStyle(() => ({ height: bar1.value }));
  const barStyle2 = useAnimatedStyle(() => ({ height: bar2.value }));
  const barStyle3 = useAnimatedStyle(() => ({ height: bar3.value }));

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isNowPlaying && styles.rowNowPlaying,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.left}>
        <CoverImage uri={song.image?.at(-1)?.url} size={44} radius={borderRadius.md} />
      </View>

      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isNowPlaying && styles.titleNowPlaying]} numberOfLines={1}>
            {song.name}
          </Text>
          <Text style={styles.dur}>{formatTime(song.duration)}</Text>
        </View>
        <View style={styles.subRow}>
          <Text style={styles.sub} numberOfLines={1}>
            {artist}
          </Text>
          <View style={styles.subTrailing}>
            {isNowPlaying ? (
              <View style={styles.waveContainer}>
                <Animated.View style={[styles.bar, barStyle1]} />
                <Animated.View style={[styles.bar, barStyle2]} />
                <Animated.View style={[styles.bar, barStyle3]} />
              </View>
            ) : null}
            {showLike && onToggleLike ? (
              <Pressable onPress={onToggleLike} hitSlop={10} style={styles.likeBtn}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={liked ? colors.accent.pink : colors.text.secondary}
                />
              </Pressable>
            ) : null}
            <LanguageBadge language={song.language || 'music'} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
    backgroundColor: 'transparent',
  },
  rowPressed: { opacity: 0.75 },
  rowNowPlaying: {
    backgroundColor: 'rgba(124, 58, 237, 0.055)',
  },

  left: {},

  meta: {
    flex: 1,
    marginLeft: spacing[3],
    gap: 2,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 0,
  },

  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    minWidth: 0,
  },
  titleNowPlaying: {
    color: colors.brand.light,
  },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 0,
  },

  subTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing[1],
  },

  sub: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    minWidth: 0,
  },

  dur: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    flexShrink: 0,
  },

  likeBtn: {
    padding: spacing[1],
  },

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
