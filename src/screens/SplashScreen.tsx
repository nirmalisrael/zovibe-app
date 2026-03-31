/**
 * Zovibe — Animated Splash Screen
 *
 * Logo: assets/images/zovibe-logo.png (transparent PNG)
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import {
  getSecure,
  KEY_USER_ID,
  KEY_ONBOARDING_DONE,
  KEY_LANG_PREFS,
  KEY_HOME_LANG_FILTER,
  setSecure,
} from '../utils/storage';
import { getUser } from '../api/mockapi';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  defaultHomeLanguageFilter,
  isValidLanguageFilterId,
} from '../constants/languages';

const LOGO_SOURCE = require('../../assets/images/zovibe-logo.png');

const SPLASH_HOLD_MS = 2500;

/** Splash-only: separates purple logo from background */
const splash = {
  /** Cooler dark so violet logo doesn’t melt into the wash */
  bg: colors.bg.primary,
  /** Slightly warmer/lighter disc than bg so the ring reads as a layer */
  logoPlate: '#16122A',
  /** Soft halo (not same solid as logo #7C3AED) */
  glowFill: 'rgba(167, 139, 250, 0.18)',
  glowBorder: 'rgba(199, 181, 253, 0.55)',
} as const;

type SplashScreenProps = {
  onAnimationComplete?: () => void;
};

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setLangPrefs = useAuthStore((s) => s.setLangPrefs);

  const { width } = Dimensions.get('window');
  const logoSize = Math.round(width * 0.36);
  const glowSize = Math.round(logoSize * 1.48);
  const plateSize = Math.round(glowSize * 1.12);
  const glowOffset = Math.round((plateSize - glowSize) / 2);

  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordTransY = useRef(new Animated.Value(14)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const combinedScale = Animated.multiply(logoScale, breathScale);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const wordmark = Animated.parallel([
      Animated.timing(wordOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(wordTransY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.05,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([entrance, Animated.delay(120), wordmark]).start(({ finished }) => {
      if (!finished) return;
      breathLoopRef.current = breathe;
      breathe.start();
      onAnimationComplete?.();
    });

    return () => {
      breathLoopRef.current?.stop();
      breathLoopRef.current = null;
    };
  }, [
    logoScale,
    logoOpacity,
    glowOpacity,
    wordOpacity,
    wordTransY,
    breathScale,
    onAnimationComplete,
  ]);

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
        const prefsNow = useAuthStore.getState().langPrefs;
        const homeRaw = await getSecure(KEY_HOME_LANG_FILTER);
        let nextHome = defaultHomeLanguageFilter(prefsNow);
        if (homeRaw && isValidLanguageFilterId(homeRaw)) {
          nextHome = homeRaw;
        } else {
          await setSecure(KEY_HOME_LANG_FILTER, nextHome);
        }
        useSettingsStore.setState({ homeLanguageFilter: nextHome });
        if (userId) {
          try {
            const user = await getUser(userId);
            setUser(user);
            if (!onboardingDone) {
              navigation.replace('Onboarding');
              return;
            }
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
    }, SPLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [navigation, setUser, setLangPrefs]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        {/* Fixed-size stack: halo + logo share one center; typography sits below (not inside ring) */}
        <View style={[styles.logoCluster, { width: plateSize, height: plateSize }]}>
          <View
            style={[
              styles.logoPlate,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                left: glowOffset,
                top: glowOffset,
                opacity: glowOpacity,
                transform: [{ scale: combinedScale }],
              },
            ]}
          />
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: combinedScale }],
              zIndex: 2,
            }}
          >
            <Image
              source={LOGO_SOURCE}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
              accessibilityLabel="Zovibe logo"
            />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.wordmarkBlock,
            {
              opacity: wordOpacity,
              transform: [{ translateY: wordTransY }],
            },
          ]}
        >
          <Text accessibilityRole="header">
            <Text style={styles.wordmarkCap}>Zo</Text>
            <Text style={styles.wordmarkRest}>vibe</Text>
          </Text>
          <Text style={styles.tagline}>feel the rhythm</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: splash.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  logoCluster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlate: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: splash.logoPlate,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  glow: {
    position: 'absolute',
    backgroundColor: splash.glowFill,
    borderWidth: 2,
    borderColor: splash.glowBorder,
  },
  wordmarkBlock: {
    marginTop: 24,
    alignItems: 'center',
  },
  wordmarkCap: {
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: 1,
    color: colors.text.primary,
  },
  wordmarkRest: {
    fontFamily: fonts.medium,
    fontSize: 34,
    letterSpacing: 3,
    color: colors.brand.light,
    textTransform: 'lowercase',
  },
  tagline: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 2.2,
    color: colors.accent.cyan,
    textTransform: 'lowercase',
    opacity: 0.9,
  },
});
