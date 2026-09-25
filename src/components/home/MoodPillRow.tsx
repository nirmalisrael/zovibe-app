import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MOODS, type MoodType } from '../../constants/moods';
import { fonts, fontSize, spacing, borderRadius } from '../../theme';

const ORDER: MoodType[] = ['chill', 'focus', 'party', 'sad', 'workout'];

const MOOD_ICONS: Record<MoodType, string> = {
  chill: 'cafe-outline',
  focus: 'sparkles-outline',
  party: 'disc-outline',
  sad: 'rainy-outline',
  workout: 'fitness-outline',
};

export function MoodPillRow({ onSelect }: { onSelect: (m: MoodType) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ORDER.map((key) => {
        const m = MOODS[key];
        const icon = MOOD_ICONS[key];
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: m.bg, borderColor: `${m.color}55` },
              pressed && styles.pillPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Mood ${m.label}`}
          >
            <Ionicons name={icon} size={15} color={m.color} style={styles.icon} />
            <Text style={[styles.label, { color: m.color }]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing[2],
    paddingVertical: spacing[1],
    paddingBottom: spacing[4],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    letterSpacing: 0.2,
  },
});
