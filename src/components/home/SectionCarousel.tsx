import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, fonts, fontSize, spacing, layout, borderRadius } from '../../theme';

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
        <View style={styles.titleWrap}>
          <View style={styles.indicator} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            style={({ pressed }) => [styles.seeBtn, pressed && styles.seeBtnPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
          >
            <Text style={styles.see}>See all</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.brand.light} style={{ marginLeft: 2 }} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: layout.sectionGap + spacing[1] },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    paddingHorizontal: 2,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  indicator: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  seeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  seeBtnPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
  },
  see: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  scrollContent: {
    gap: spacing[3],
    paddingRight: layout.screenPadding,
    paddingVertical: spacing[1],
  },
});
