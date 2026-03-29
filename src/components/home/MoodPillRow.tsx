import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { MOODS, type MoodType } from '../../constants/moods';
import { fonts, fontSize, spacing, borderRadius } from '../../theme';

const ORDER: MoodType[] = ['chill', 'focus', 'party', 'sad', 'workout'];

export function MoodPillRow({ onSelect }: { onSelect: (m: MoodType) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ORDER.map((key) => {
        const m = MOODS[key];
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={[styles.pill, { backgroundColor: m.bg, borderColor: m.color }]}
          >
            <Text style={[styles.label, { color: m.color }]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing[2], paddingVertical: spacing[2] },
  pill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing[2],
  },
  label: { fontFamily: fonts.medium, fontSize: fontSize.sm },
});
