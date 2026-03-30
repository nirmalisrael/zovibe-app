import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loginUser } from '../api/mockapi';
import { ZInput } from '../components/ui/ZInput';
import { ZButton } from '../components/ui/ZButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { setSecure, KEY_USER_ID } from '../utils/storage';
import { colors, fonts, fontSize, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setGuest = useAuthStore((s) => s.setGuest);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const onSignIn = async () => {
    setToast(null);
    try {
      const user = await loginUser(username.trim(), password);
      await setSecure(KEY_USER_ID, user.id);
      setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch {
      setToast('Wrong username or password');
    }
  };

  const onGuest = () => {
    setGuest(true);
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  };

  return (
    <ScreenErrorBoundary>
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View style={styles.pulseSm} />
          <Text style={styles.word}>zovibe</Text>
        </View>
        <ZInput
          label="Username"
          placeholder="e.g. nirmalisrael"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <ZInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastTxt}>{toast}</Text>
          </View>
        ) : null}
        <ZButton title="Sign in" onPress={() => void onSignIn()} />
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
          <Text style={styles.link}>Create account</Text>
        </Pressable>
        <Pressable onPress={onGuest} style={styles.guestWrap}>
          <Text style={styles.guest}>Continue as guest</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', marginBottom: spacing[8] },
  pulseSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primary,
    marginBottom: spacing[2],
  },
  word: { fontFamily: fonts.light, fontSize: fontSize['3xl'], color: colors.brand.light },
  linkWrap: { marginTop: spacing[4], alignItems: 'center' },
  link: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light },
  guestWrap: { marginTop: spacing[6], alignItems: 'center' },
  guest: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary },
  toast: {
    backgroundColor: colors.error,
    padding: spacing[3],
    borderRadius: 8,
    marginBottom: spacing[3],
  },
  toastTxt: { fontFamily: fonts.medium, color: '#fff', fontSize: fontSize.sm },
});
