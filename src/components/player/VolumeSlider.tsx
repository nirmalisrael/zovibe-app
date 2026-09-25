import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, fonts, fontSize, spacing } from '../../theme';

type VolumeSliderProps = Readonly<{
  value: number;
  onChange: (v: number) => void;
}>;

/** RNTP volume 0–1 */
export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Volume</Text>
      <View style={styles.row}>
        <Ionicons name="volume-low" size={20} color={colors.text.tertiary} style={styles.edgeIcon} />
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={value}
          onValueChange={onChange}
          onSlidingComplete={onChange}
          minimumTrackTintColor={colors.brand.primary}
          maximumTrackTintColor={colors.border.default}
          thumbTintColor={colors.brand.light}
          accessibilityLabel="Volume"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
        />
        <Ionicons name="volume-high" size={22} color={colors.text.tertiary} style={styles.edgeIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing[3], width: '100%' },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  edgeIcon: { opacity: 0.85 },
  slider: { flex: 1, height: 40 },
});
