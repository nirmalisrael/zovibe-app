import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, fontSize } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import {
  getSecure,
  KEY_USER_ID,
  KEY_ONBOARDING_DONE,
  KEY_LANG_PREFS,
} from '../utils/storage';
import { getUser } from '../api/mockapi';
import { useAuthStore } from '../store/authStore';

export function SplashScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setLangPrefs = useAuthStore((s) => s.setLangPrefs);
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [scale, fade]);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const userId = await getSecure(KEY_USER_ID);
        const onboardingDone = await getSecure(KEY_ONBOARDING_DONE);
        const langRaw = await getSecure(KEY_LANG_PREFS);
        if (langRaw) {
          try {
            const prefs = JSON.parse(langRaw) as string[];
            if (Array.isArray(prefs)) setLangPrefs(prefs);
          } catch {
            /* ignore */
          }
        }
        if (userId) {
          try {
            const user = await getUser(userId);
            setUser(user);
            navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
            return;
          } catch {
            /* fall through */
          }
        }
        if (!onboardingDone) {
          navigation.replace('Onboarding');
        } else {
          navigation.replace('Login');
        }
      })();
    }, 2500);
    return () => clearTimeout(t);
  }, [navigation, setUser, setLangPrefs]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.pulse} />
      </Animated.View>
      <Animated.Text style={[styles.mark, { opacity: fade }]}>zovibe</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.primary,
    opacity: 0.9,
  },
  mark: {
    marginTop: 24,
    fontFamily: fonts.light,
    fontSize: fontSize['4xl'],
    color: colors.brand.light,
  },
});
