import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loginUser } from '../api/mockapi';
import { ZInput } from '../components/ui/ZInput';
import { ZButton } from '../components/ui/ZButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { setSecure, KEY_USER_ID } from '../utils/storage';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const LOGO_MARK = require('../../assets/images/zovibe-logo.png');

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setGuest = useAuthStore((s) => s.setGuest);
  const passwordRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const onSignIn = useCallback(async () => {
    if (!canSubmit || loading) return;
    setToast(null);
    setLoading(true);
    try {
      const user = await loginUser(username.trim(), password);
      await setSecure(KEY_USER_ID, user.id);
      setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch {
      setToast('Wrong username or password');
    } finally {
      setLoading(false);
    }
  }, [canSubmit, loading, username, password, navigation, setUser]);

  const onGuest = () => {
    setGuest(true);
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  };

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={styles.screenNoPad}>
        <View style={styles.bgAccent} pointerEvents="none">
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.28)', 'transparent']}
            style={styles.blobTop}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 1, y: 0.6 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(6, 182, 212, 0.12)']}
            style={styles.blobBottom}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Image
                source={LOGO_MARK}
                style={styles.logoMark}
                resizeMode="contain"
                accessibilityLabel="Zovibe logo"
              />
              <Text accessibilityRole="header" style={styles.wordmark}>
                <Text style={styles.wordCap}>Zo</Text>
                <Text style={styles.wordRest}>vibe</Text>
              </Text>
              <Text style={styles.tagline}>Feel the rhythm</Text>
            </View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to sync playlists, likes, and history.</Text>

            <View style={styles.card}>
              {toast ? (
                <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle" size={20} color="#FECACA" style={styles.errorIcon} />
                  <Text style={styles.errorTxt}>{toast}</Text>
                </View>
              ) : null}

              <ZInput
                compact
                label="Username"
                placeholder="e.g. nirmalisrael"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (toast) setToast(null);
                }}
                accessibilityLabel="Username"
              />
              <ZInput
                ref={passwordRef}
                compact
                label="Password"
                placeholder="Your password"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void onSignIn()}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (toast) setToast(null);
                }}
                accessibilityLabel="Password"
              />

              <ZButton
                title="Sign in"
                loading={loading}
                disabled={!canSubmit}
                onPress={() => void onSignIn()}
                style={styles.primaryBtn}
              />
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerTxt}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <ZButton
              title="Continue as guest"
              variant="ghost"
              onPress={onGuest}
              style={styles.guestBtn}
            />

            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="Create a new account"
            >
              <Text style={styles.footerMuted}>New here? </Text>
              <Text style={styles.footerStrong}>Create account</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenNoPad: { paddingHorizontal: 0 },
  flex: { flex: 1 },
  bgAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 320,
    height: 280,
    borderRadius: 160,
    opacity: 0.9,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -40,
    right: -80,
    width: 280,
    height: 240,
    borderRadius: 140,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
  },
  hero: { alignItems: 'center', marginBottom: spacing[5] },
  logoMark: { width: 80, height: 80, marginBottom: spacing[3] },
  wordmark: { marginBottom: 0 },
  /** Zo bold + vibe medium (between compact form and Splash). */
  wordCap: {
    fontFamily: fonts.bold,
    fontSize: fontSize['3xl'],
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  wordRest: {
    fontFamily: fonts.medium,
    fontSize: fontSize['3xl'],
    color: colors.brand.light,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  tagline: {
    marginTop: spacing[2],
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.accent.cyan,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    opacity: 0.9,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    marginBottom: spacing[1],
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 75, 74, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(226, 75, 74, 0.45)',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  errorIcon: { marginRight: spacing[2] },
  errorTxt: {
    flex: 1,
    fontFamily: fonts.medium,
    color: '#FECACA',
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  primaryBtn: { alignSelf: 'stretch', marginTop: spacing[2] },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[3],
    gap: spacing[3],
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border.default },
  dividerTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  guestBtn: { alignSelf: 'stretch' },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[4],
    paddingVertical: spacing[1],
  },
  pressed: { opacity: 0.85 },
  footerMuted: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text.secondary },
  footerStrong: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light },
});
