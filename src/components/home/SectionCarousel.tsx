import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, layout } from '../../theme';

export function SectionCarousel({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll}>
            <Text style={styles.see}>See all →</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[3], paddingRight: layout.screenPadding }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: layout.sectionGap },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text.primary },
  see: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.brand.light },
});
