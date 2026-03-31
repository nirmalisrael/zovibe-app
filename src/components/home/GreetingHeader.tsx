import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing } from '../../theme';

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
}: Readonly<{
  onAvatarPress: () => void;
  initials: string;
}>) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.wordmark}>
        <Text style={styles.wordCap}>Zo</Text>
        <Text style={styles.wordRest}>vibe</Text>
      </Text>
      <Pressable
        onPress={onAvatarPress}
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
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
  wordmark: { marginBottom: 0 },
  wordCap: {
    fontFamily: fonts.bold,
    fontSize: fontSize['2xl'],
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  wordRest: {
    fontFamily: fonts.medium,
    fontSize: fontSize['2xl'],
    color: colors.brand.light,
    letterSpacing: 2,
    textTransform: 'lowercase',
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
  avatarPressed: { opacity: 0.88 },
  ini: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.text.primary },
});

export { greetingLine };
