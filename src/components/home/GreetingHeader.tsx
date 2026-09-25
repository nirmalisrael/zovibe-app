import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, fonts, fontSize, spacing } from '../../theme';

function greetingLine(): string {
  const hour = new Date().getHours();

  const greetings: Record<string, string[]> = {
    morning: [
      'காலை வணக்கம் ☀️ Coffee kudichaacha?',
      'Good morning! Time to pretend we love mornings 😄',
      'Rise and shine! ☀️… or just shine later 😴',
      'Wakey wakey! Dreams over, reality loading...',
      'Good morning da! Innikki sema productive ah irupom 💪',
      'New day, new chance… but first coffee ☕',
      'Morning! Alarm oda fight win pannitiya? 😆',
    ],

    afternoon: [
      'Good afternoon! Saptiya? 😋',
      'மதிய வணக்கம்! Work ah? illa lunch ah? 😄',
      'Lunch time vibes 🍛 + sleep mode ON 😴',
      'Half day over! Survived so far 👏',
      'Afternoon ah? Energy konjam recharge pannunga 🔋',
      'Still working ah? Respect 🫡',
      'Sun is high, motivation… maybe medium 😅',
    ],

    evening: [
      'Good evening! Chill mode start 😌',
      'மாலை வணக்கம்! Tea kudikalam vaa ☕',
      'Evening vibes 🌇 + snacks missing 😋',
      'Work mudinjucha? Freedom unlocked 🎉',
      'Vanakkam! Day epdi pochu?',
      'Relax time… but phone ah vida mudiyuma? 😄',
      'Sun set, stress set agattum 🙌',
    ],

    night: [
      'Good night! Sleep well 😴',
      'இனிய இரவு! கனவில் jackpot அடிங்க 😄',
      'Still awake ah? Night owl 🦉 spotted!',
      'Sleep now… tomorrow version of you will thank you 🙏',
      'Late night thoughts ah? Dangerous 😅',
      'Phone ah vainga… sleep pannunga 😆',
      'Dream big… but first sleep properly 😴✨',
    ],
  };

  let period = 'night';
  if (hour >= 5 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 17) period = 'afternoon';
  else if (hour >= 17 && hour < 21) period = 'evening';

  const options = greetings[period];
  return options[Math.floor(Math.random() * options.length)];
}

export function GreetingHeader({
  onAvatarPress,
  onSearchPress,
  initials,
}: Readonly<{
  onAvatarPress: () => void;
  onSearchPress?: () => void;
  initials: string;
}>) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.wordmark}>
        <Text style={styles.wordCap}>Zo</Text>
        <Text style={styles.wordRest}>vibe</Text>
      </Text>
      <View style={styles.rightActions}>
        {onSearchPress ? (
          <Pressable
            onPress={onSearchPress}
            style={({ pressed }) => [styles.searchBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Search songs"
            hitSlop={6}
          >
            <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onAvatarPress}
          style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.ini}>{initials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[5],
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.8,
    backgroundColor: colors.bg.tertiary,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
