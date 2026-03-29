import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { usePlayer } from '../../hooks/usePlayer';
import { CoverImage } from '../ui/CoverImage';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../../theme';

export function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const queue = usePlayerStore((s) => s.queue);
  const current = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlay, skipToNext } = usePlayer();

  if (!queue.length || !current) return null;

  const art = current.image?.[current.image.length - 1]?.url;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.inner}
        onPress={onExpand}
      >
        <CoverImage uri={art} size={48} radius={borderRadius.sm} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {current.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {current.artists.primary.map((a) => a.name).join(', ')}
          </Text>
        </View>
        <Pressable onPress={() => void togglePlay()} hitSlop={8}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            color={colors.text.primary}
          />
        </Pressable>
        <Pressable onPress={() => void skipToNext()} hitSlop={8}>
          <Ionicons name="play-skip-forward" size={24} color={colors.text.secondary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
    paddingBottom: spacing[1],
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: layout.screenPadding,
    minHeight: layout.miniPlayerHeight,
  },
  meta: { flex: 1 },
  title: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text.primary },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.text.secondary },
});
