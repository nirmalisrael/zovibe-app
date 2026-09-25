import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { JioSaavnSong } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { PlayingWaveIndicator } from '../ui/PlayingWaveIndicator';
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
  /** Signed-in: add to a user playlist (opens picker when used with onAddToPlaylist). */
  showAddToPlaylist?: boolean;
  onAddToPlaylist?: () => void;
  onLongPress?: () => void;
}>;

export function SongRow({
  song,
  index,
  onPress,
  onToggleLike,
  liked,
  showLike = true,
  showAddToPlaylist = false,
  onAddToPlaylist,
  onLongPress,
}: SongRowProps) {
  const artist = getPrimaryArtistNames(song);
  const currentSongId = usePlayerStore((s) => s.currentSong?.id);
  const isPlayerRunning = usePlayerStore((s) => s.isPlaying);
  const isNowPlaying = currentSongId === song.id;

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
              <PlayingWaveIndicator active={isPlayerRunning} />
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
            {showAddToPlaylist && onAddToPlaylist ? (
              <Pressable
                onPress={onAddToPlaylist}
                hitSlop={10}
                style={styles.likeBtn}
                accessibilityRole="button"
                accessibilityLabel="Add to playlist"
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.text.secondary} />
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
});
