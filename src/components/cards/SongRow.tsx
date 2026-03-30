import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JioSaavnSong } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { LanguageBadge } from '../ui/LanguageBadge';
import { formatTime } from '../../utils/formatTime';
import { getPrimaryArtistNames } from '../../utils/songHelpers';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

export function SongRow({
  song,
  index,
  onPress,
  onToggleLike,
  liked,
  showLike = true,
  onLongPress,
}: {
  song: JioSaavnSong;
  index?: number;
  onPress: () => void;
  onToggleLike?: () => void;
  liked?: boolean;
  showLike?: boolean;
  onLongPress?: () => void;
}) {
  const artist = getPrimaryArtistNames(song);
  return (
    <Pressable style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      {index != null ? (
        <Text style={styles.idx}>{index}</Text>
      ) : (
        <CoverImage uri={song.image?.[song.image.length - 1]?.url} size={48} radius={borderRadius.sm} />
      )}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {song.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {artist}
        </Text>
        <LanguageBadge language={song.language || 'music'} />
      </View>
      <Text style={styles.dur}>{formatTime(song.duration)}</Text>
      {showLike && onToggleLike ? (
        <Pressable onPress={onToggleLike} hitSlop={8}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? colors.accent.pink : colors.text.secondary}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  idx: {
    width: 24,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  meta: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text.primary },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary },
  dur: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.text.tertiary },
});
