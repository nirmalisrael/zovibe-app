import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, borderRadius, spacing } from '../../theme';

function paletteFor(lang: string) {
  const l = lang.toLowerCase();
  if (l.includes('tamil')) return colors.lang.tamil;
  if (l.includes('hindi')) return colors.lang.hindi;
  if (l.includes('english')) return colors.lang.english;
  return colors.lang.indian;
}

export function LanguageBadge({ language }: { language: string }) {
  const p = paletteFor(language);
  return (
    <View style={[styles.pill, { backgroundColor: p.bg, borderColor: p.border }]}>
      <Text style={[styles.txt, { color: p.text }]} numberOfLines={1}>
        {language}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    maxWidth: 120,
  },
  txt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
});
