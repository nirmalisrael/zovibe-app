import { useState, useRef, useCallback, useEffect } from 'react';
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
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registerUser } from '../api/mockapi';
import { ZInput } from '../components/ui/ZInput';
import { ZButton } from '../components/ui/ZButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { setSecure, KEY_USER_ID } from '../utils/storage';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const LOGO_MARK = require('../../assets/images/zovibe-logo.png');

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(show, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const subHide = Keyboard.addListener(hide, () => {
      setKeyboardHeight(0);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  /** Last fields sit above the keyboard once it has opened. */
  const scrollLowerFieldsIntoView = useCallback(() => {
    const delay = Platform.OS === 'ios' ? 160 : 220;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  const canSubmit =
    fullName.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirm.length > 0;

  const clearError = () => {
    if (error) setError(null);
  };

  const onCreate = useCallback(async () => {
    if (!canSubmit || loading) return;
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (fullName.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }
    setLoading(true);
    try {
      const user = await registerUser(fullName.trim(), username.trim(), email.trim(), password);
      await setSecure(KEY_USER_ID, user.id);
      setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [canSubmit, loading, fullName, username, email, password, confirm, navigation, setUser]);

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={styles.screenNoPad}>
        <View style={styles.bgAccent} pointerEvents="none">
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.35)', 'transparent']}
            style={styles.blobTop}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 1, y: 0.6 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(236, 72, 153, 0.1)']}
            style={styles.blobBottom}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={[
              styles.scroll,
              {
                paddingBottom:
                  spacing[6] +
                  insets.bottom +
                  (Platform.OS === 'android' ? keyboardHeight : 0),
              },
            ]}
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

            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Add your details — you&apos;ll pick music languages next.
            </Text>

            <View style={styles.card}>
              {error ? (
                <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle" size={20} color="#FECACA" style={styles.errorIcon} />
                  <Text style={styles.errorTxt}>{error}</Text>
                </View>
              ) : null}

              <ZInput
                compact
                label="Your name"
                placeholder="e.g. Nirmal Israel"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t);
                  clearError();
                }}
                accessibilityLabel="Your full name"
              />
              <ZInput
                ref={usernameRef}
                label="Username"
                placeholder="e.g. nirmalisrael"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  clearError();
                }}
                accessibilityLabel="Username"
              />
              <ZInput
                ref={emailRef}
                compact
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearError();
                }}
                accessibilityLabel="Email"
              />
              <ZInput
                ref={passwordRef}
                compact
                label="Password"
                placeholder="At least 6 characters"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                onFocus={scrollLowerFieldsIntoView}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearError();
                }}
                accessibilityLabel="Password"
              />
              <ZInput
                ref={confirmRef}
                compact
                label="Confirm password"
                placeholder="Re-enter password"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => void onCreate()}
                onFocus={scrollLowerFieldsIntoView}
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  clearError();
                }}
                accessibilityLabel="Confirm password"
              />

              <ZButton
                title="Create account"
                loading={loading}
                disabled={!canSubmit}
                onPress={() => void onCreate()}
                style={styles.primaryBtn}
              />
            </View>

            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="Sign in with existing account"
            >
              <Text style={styles.footerMuted}>Already have an account? </Text>
              <Text style={styles.footerStrong}>Sign in</Text>
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
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 75, 74, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(226, 75, 74, 0.45)',
    padding: spacing[2],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  errorIcon: { marginRight: spacing[2] },
  errorTxt: {
    flex: 1,
    fontFamily: fonts.medium,
    color: '#FECACA',
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  primaryBtn: { alignSelf: 'stretch', marginTop: spacing[1] },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingVertical: spacing[1],
  },
  pressed: { opacity: 0.85 },
  footerMuted: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text.secondary },
  footerStrong: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light },
});
