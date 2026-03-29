import { Pressable, Text, StyleSheet, View } from 'react-native';
import type { JioSaavnArtistListItem } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

const SIZE = 96;

export function ArtistCard({
  artist,
  onPress,
}: {
  artist: JioSaavnArtistListItem;
  onPress: () => void;
}) {
  const img = artist.image?.[artist.image.length - 1]?.url;
  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <View style={styles.circle}>
        <CoverImage uri={img} size={SIZE} radius={SIZE / 2} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {artist.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE + 16, alignItems: 'center' },
  circle: {
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border.strong,
  },
  name: {
    marginTop: spacing[2],
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
