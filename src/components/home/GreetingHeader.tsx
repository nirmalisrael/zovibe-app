import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

function greetingLine(): string {
  const h = new Date().getHours();
  if (h < 12) return 'காலை வணக்கம்';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Vanakkam';
  return 'Good evening';
}

export function GreetingHeader({
  onAvatarPress,
  initials,
}: {
  onAvatarPress: () => void;
  initials: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.word}>zovibe</Text>
      <Pressable onPress={onAvatarPress} style={styles.avatar}>
        <Text style={styles.ini}>{initials}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  word: {
    fontFamily: fonts.light,
    fontSize: fontSize['2xl'],
    color: colors.brand.light,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ini: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.text.primary },
});

export { greetingLine };
