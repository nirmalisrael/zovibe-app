import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MockAPIPlaylistRow } from '../../api/mockapi';
import { parseJsonArray } from '../../api/mockapi';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

export function PlaylistCard({
  playlist,
  onPress,
}: {
  playlist: MockAPIPlaylistRow;
  onPress: () => void;
}) {
  const count = parseJsonArray<string>(playlist.songIds, []).length;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconBox}>
        <Ionicons name="musical-notes" size={28} color={colors.brand.light} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={styles.sub}>{count} songs</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  title: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text.primary },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary },
});
