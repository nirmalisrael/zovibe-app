import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZButton } from '../components/ui/ZButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { colors, fonts, fontSize, spacing, borderRadius } from '../theme';
import { setSecure, KEY_LANG_PREFS, KEY_ONBOARDING_DONE } from '../utils/storage';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  sanitizeLangPrefs,
  defaultHomeLanguageFilter,
  getExploreLanguagePillIds,
} from '../constants/languages';

const CARDS = [
  { id: 'tamil', title: 'Tamil music', emoji: '🎵', bg: '#1F0E20', fg: '#EC4899' },
  { id: 'hindi', title: 'Hindi / Bollywood', emoji: '🎵', bg: '#1A1A0A', fg: '#EF9F27' },
  { id: 'english', title: 'English', emoji: '🎵', bg: '#0E1F30', fg: '#06B6D4' },
  { id: 'indian', title: 'All Indian', emoji: '🎵', bg: '#1A1050', fg: '#A78BFA' },
] as const;

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const route = useRoute();
  const setLangPrefs = useAuthStore((s) => s.setLangPrefs);
  const [selected, setSelected] = useState<string[]>(['tamil', 'hindi']);

  const prefsOnly = route.name === 'OnboardingPrefs';

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const onContinue = async () => {
    if (!selected.length) return;
    const sanitized = sanitizeLangPrefs(selected);
    await setSecure(KEY_LANG_PREFS, JSON.stringify(sanitized));
    setLangPrefs(sanitized);
    if (!prefsOnly) {
      await setSecure(KEY_ONBOARDING_DONE, '1');
      useSettingsStore.getState().setHomeLanguageFilter(defaultHomeLanguageFilter(sanitized));
      navigation.navigate('Login' as never);
    } else {
      const cur = useSettingsStore.getState().homeLanguageFilter;
      if (!getExploreLanguagePillIds(sanitized).includes(cur)) {
        useSettingsStore.getState().setHomeLanguageFilter(defaultHomeLanguageFilter(sanitized));
      }
      navigation.goBack();
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>What do you want to hear?</Text>
        <View style={styles.grid}>
          {CARDS.map((c) => {
            const on = selected.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => toggle(c.id)}
                style={[
                  styles.card,
                  { backgroundColor: c.bg, borderColor: on ? c.fg : 'transparent', borderWidth: on ? 2 : 0 },
                ]}
              >
                <Text style={styles.emoji}>{c.emoji}</Text>
                <Text style={[styles.cardTitle, { color: c.fg }]}>{c.title}</Text>
              </Pressable>
            );
          })}
        </View>
        <ZButton title="Continue" onPress={() => void onContinue()} disabled={!selected.length} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing[8] },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    marginBottom: spacing[6],
    marginTop: spacing[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[8],
  },
  card: {
    width: '47%',
    minHeight: 100,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    justifyContent: 'center',
  },
  emoji: { fontSize: 28, marginBottom: spacing[2] },
  cardTitle: { fontFamily: fonts.medium, fontSize: fontSize.md },
});
