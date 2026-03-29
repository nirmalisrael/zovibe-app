import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registerUser } from '../api/mockapi';
import { ZInput } from '../components/ui/ZInput';
import { ZButton } from '../components/ui/ZButton';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { setSecure, KEY_USER_ID } from '../utils/storage';
import { colors, fonts, fontSize, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      const user = await registerUser(username.trim(), email.trim(), password);
      await setSecure(KEY_USER_ID, user.id);
      setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    }
  };

  return (
    <ScreenErrorBoundary>
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Text style={styles.title}>Create account</Text>
        <ZInput label="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
        <ZInput
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <ZInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <ZInput label="Confirm password" secureTextEntry value={confirm} onChangeText={setConfirm} />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <ZButton title="Create account" onPress={() => void onCreate()} />
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
          <Text style={styles.link}>Already have an account?</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    marginBottom: spacing[6],
  },
  err: { color: colors.error, marginBottom: spacing[2], fontFamily: fonts.regular },
  linkWrap: { marginTop: spacing[4], alignItems: 'center' },
  link: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light },
});
