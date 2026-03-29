import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, fonts, fontSize, spacing } from '../../theme';

/** RNTP volume 0–1 */
export function VolumeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Volume</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={value}
        onSlidingComplete={onChange}
        minimumTrackTintColor={colors.brand.primary}
        maximumTrackTintColor={colors.border.default}
        thumbTintColor={colors.brand.light}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing[2] },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  slider: { width: '100%', height: 40 },
});
