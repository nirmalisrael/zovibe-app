import { View, StyleSheet, Image } from 'react-native';
import FastImage from 'react-native-fast-image';
import { borderRadius, colors } from '../../theme';

export function CoverImage({
  uri,
  size,
  radius = borderRadius.md,
}: {
  uri: string | undefined;
  size: number;
  radius?: number;
}) {
  if (!uri) {
    return (
      <View style={[styles.ph, { width: size, height: size, borderRadius: radius }]} />
    );
  }
  return (
    <FastImage
      source={{ uri, priority: FastImage.priority.normal }}
      style={{ width: size, height: size, borderRadius: radius }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
}

/** Fallback using RN Image when uri fails — FastImage handles errors poorly on some builds */
export function CoverImageSoft({
  uri,
  size,
  radius = borderRadius.md,
}: {
  uri: string | undefined;
  size: number;
  radius?: number;
}) {
  if (!uri) {
    return (
      <View style={[styles.ph, { width: size, height: size, borderRadius: radius }]} />
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius }}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  ph: {
    backgroundColor: colors.bg.tertiary,
  },
});
