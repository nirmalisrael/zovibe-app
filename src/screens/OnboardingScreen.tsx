import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ZButton } from '../components/ui/ZButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { colors, fonts, fontSize, spacing, borderRadius } from '../theme';
import { setSecure, KEY_LANG_PREFS, KEY_ONBOARDING_DONE } from '../utils/storage';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  LANGUAGE_CATALOG,
  ONBOARDING_LANGUAGE_SUBTITLES,
  applyOnboardingLanguageToggle,
  sanitizeLangPrefs,
  defaultHomeLanguageFilter,
  getExploreLanguagePillIds,
  getLanguageLabel,
  type LanguageFilterId,
} from '../constants/languages';
import type { RootStackParamList } from '../navigation/types';

/** UI rows driven by {@link LANGUAGE_CATALOG} (static in-app; no API yet). */
const CARDS = LANGUAGE_CATALOG.map((entry) => ({
  id: entry.id,
  title: entry.label,
  subtitle: ONBOARDING_LANGUAGE_SUBTITLES[entry.id],
  ...colors.lang[entry.id],
}));

export function OnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const setLangPrefs = useAuthStore((s) => s.setLangPrefs);
  const [selected, setSelected] = useState<string[]>(['tamil', 'hindi']);
  const [homeFocus, setHomeFocus] = useState<LanguageFilterId>('all');

  const prefsOnly = route.name === 'OnboardingPrefs';

  const homeOptions = useMemo(() => getExploreLanguagePillIds(selected), [selected]);

  useFocusEffect(
    useCallback(() => {
      if (route.name !== 'OnboardingPrefs') return;
      const p = useAuthStore.getState().langPrefs;
      if (p.length) setSelected([...p]);
      const stored = useSettingsStore.getState().homeLanguageFilter;
      const opts = getExploreLanguagePillIds(p);
      setHomeFocus(
        opts.includes(stored) ? stored : defaultHomeLanguageFilter(sanitizeLangPrefs(p))
      );
    }, [route.name])
  );

  useEffect(() => {
    if (!prefsOnly) return;
    setHomeFocus((cur) =>
      homeOptions.includes(cur) ? cur : defaultHomeLanguageFilter(sanitizeLangPrefs(selected))
    );
  }, [prefsOnly, homeOptions, selected]);

  const toggle = (id: string) => {
    setSelected((s) => applyOnboardingLanguageToggle(s, id));
  };

  const onContinue = async () => {
    if (!selected.length) return;
    const sanitized = sanitizeLangPrefs(selected);
    await setSecure(KEY_LANG_PREFS, JSON.stringify(sanitized));
    setLangPrefs(sanitized);
    if (prefsOnly) {
      const nextHome = homeOptions.includes(homeFocus)
        ? homeFocus
        : defaultHomeLanguageFilter(sanitized);
      useSettingsStore.getState().setHomeLanguageFilter(nextHome);
      navigation.goBack();
      return;
    }
    await setSecure(KEY_ONBOARDING_DONE, '1');
    useSettingsStore.getState().setHomeLanguageFilter(defaultHomeLanguageFilter(sanitized));
    const { isAuthenticated, isGuest } = useAuthStore.getState();
    const rootNav = navigation as NativeStackNavigationProp<RootStackParamList>;
    if (isAuthenticated && !isGuest) {
      rootNav.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } else {
      rootNav.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.kicker}>{prefsOnly ? 'Preferences' : 'Welcome'}</Text>
          <Text style={styles.title}>What do you want to hear?</Text>
          <Text style={styles.subtitle}>
            {prefsOnly
              ? 'Your picks drive Home and Explore. Set the default Home view below.'
              : 'Pick one or more. You can change this anytime in Profile.'}
          </Text>

          <View style={styles.grid}>
            {CARDS.map((c) => {
              const on = selected.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  style={({ pressed }) => [
                    styles.cardOuter,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <LinearGradient
                    colors={[`${c.bg}F2`, `${c.bg}CC`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.cardInner,
                      {
                        borderColor: on ? c.text : colors.border.subtle,
                        borderWidth: on ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.check,
                          { borderColor: on ? c.text : colors.border.default },
                          on && { backgroundColor: `${c.text}35` },
                        ]}
                      >
                        {on ? (
                          <Ionicons name="checkmark" size={18} color={c.text} />
                        ) : null}
                      </View>
                    </View>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{c.title}</Text>
                    <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {prefsOnly ? (
            <View style={styles.homeBlock}>
              <Text style={styles.homeSec}>Default on Home</Text>
              <Text style={styles.homeHint}>
                Same language chips as Explore — only your selected languages plus &quot;All&quot;.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {homeOptions.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setHomeFocus(f)}
                    style={[styles.pill, homeFocus === f && styles.pillOn]}
                  >
                    <Text style={[styles.pillTxt, homeFocus === f && styles.pillTxtOn]}>
                      {getLanguageLabel(f)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <ZButton title="Continue" onPress={() => void onContinue()} disabled={!selected.length} />
        </ScrollView>
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing[10],
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.brand.light,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize['2xl'],
    color: colors.text.primary,
    marginBottom: spacing[2],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[8],
    justifyContent: 'space-between',
  },
  cardOuter: {
    width: '48%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.92 },
  cardInner: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    minHeight: 128,
    justifyContent: 'flex-end',
  },
  cardTop: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    marginBottom: spacing[1],
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  homeBlock: { marginBottom: spacing[6] },
  homeSec: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  homeHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], paddingVertical: spacing[1] },
  pill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillOn: { borderColor: colors.brand.primary, backgroundColor: colors.bg.tertiary },
  pillTxt: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.text.secondary },
  pillTxtOn: { color: colors.brand.light },
});
