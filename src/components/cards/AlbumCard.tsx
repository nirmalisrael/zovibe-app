import { Pressable, Text, StyleSheet, View } from 'react-native';
import type { JioSaavnAlbumListItem } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { LanguageBadge } from '../ui/LanguageBadge';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

const SIZE = 124;

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
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Album ${album.name}`}
    >
      <View style={styles.coverContainer}>
        <CoverImage uri={img} size={SIZE} radius={borderRadius.lg} />
      </View>
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
  wrap: { width: SIZE + 6 },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  coverContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    backgroundColor: colors.bg.surface,
  },
  name: {
    marginTop: spacing[2],
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    lineHeight: 18,
  },
  badge: { marginTop: spacing[1] },
});
