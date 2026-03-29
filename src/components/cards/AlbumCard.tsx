import { Pressable, Text, StyleSheet, View } from 'react-native';
import type { JioSaavnAlbumListItem } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { LanguageBadge } from '../ui/LanguageBadge';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

const SIZE = 120;

export function AlbumCard({
  album,
  onPress,
}: {
  album: JioSaavnAlbumListItem;
  onPress: () => void;
}) {
  const img = album.image?.[album.image.length - 1]?.url;
  const lang = album.language || 'album';
  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <CoverImage uri={img} size={SIZE} radius={borderRadius.md} />
      <Text style={styles.name} numberOfLines={2}>
        {album.name}
      </Text>
      <View style={styles.badge}>
        <LanguageBadge language={lang} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE + 8 },
  name: {
    marginTop: spacing[2],
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  badge: { marginTop: spacing[1] },
});
