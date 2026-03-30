import { View, Text, Pressable, StyleSheet, Switch, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { deleteSecure, KEY_USER_ID, KEY_HOME_LANG_FILTER } from '../utils/storage';
import { useQuery } from '@tanstack/react-query';
import { getUserPlaylists, parseJsonArray } from '../api/mockapi';
import { queryKeys } from '../hooks/queryKeys';
import type { ProfileStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius } from '../theme';
import { navigationRef } from '../navigation/navigationRef';
import { getProfileHomeFilterOptions, getLanguageLabel } from '../constants/languages';
import { displayNameOrUsername, resolveUserAvatar } from '../entities';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const logout = useAuthStore((s) => s.logout);
  const audioQuality = useSettingsStore((s) => s.audioQuality);
  const setAudioQuality = useSettingsStore((s) => s.setAudioQuality);
  const homeLanguageFilter = useSettingsStore((s) => s.homeLanguageFilter);
  const setHomeLanguageFilter = useSettingsStore((s) => s.setHomeLanguageFilter);

  const likedCount = user ? parseJsonArray<string>(user.likedSongs, []).length : 0;
  const historyCount = user ? parseJsonArray<string>(user.recentlyPlayed, []).length : 0;
  const playlistsQ = useQuery({
    queryKey: queryKeys.playlists(user?.id ?? ''),
    queryFn: () => getUserPlaylists(user!.id),
    enabled: !!user?.id,
  });
  const playlistsCount = playlistsQ.data?.length ?? 0;

  const onSignOut = async () => {
    await deleteSecure(KEY_USER_ID);
    logout();
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (isGuest) {
    return (
      <ScreenWrapper>
        <Text style={styles.title}>Guest</Text>
        <Text style={styles.muted}>Sign in for playlists, likes, and synced history.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => {
            useAuthStore.getState().logout();
            navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
          }}
        >
          <Text style={styles.btnTxt}>Go to sign in</Text>
        </Pressable>
      </ScreenWrapper>
    );
  }

  if (!user) {
    return null;
  }

  const created = new Date(user.createdAt);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatar}>
          <Text style={styles.ini}>{resolveUserAvatar(user)}</Text>
        </View>
        <Text style={styles.un}>{displayNameOrUsername(user)}</Text>
        <Text style={styles.handle}>@{user.username}</Text>
        <Text style={styles.em}>{user.email}</Text>
        <Text style={styles.muted}>Member since {created.toLocaleDateString()}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statN}>{likedCount}</Text>
            <Text style={styles.statL}>Liked</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statN}>{playlistsCount}</Text>
            <Text style={styles.statL}>Playlists</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statN}>{historyCount}</Text>
            <Text style={styles.statL}>History</Text>
          </View>
        </View>

        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('OnboardingPrefs')}
        >
          <Text style={styles.rowT}>Language preferences</Text>
          <Text style={styles.rowE}>Edit</Text>
        </Pressable>

        <Text style={styles.sec}>Audio quality</Text>
        <View style={styles.row}>
          <Text style={styles.rowT}>High (320kbps)</Text>
          <Switch
            value={audioQuality === 'high'}
            onValueChange={(v) => setAudioQuality(v ? 'high' : 'normal')}
            trackColor={{ true: colors.brand.primary, false: colors.bg.tertiary }}
          />
        </View>

        <Text style={styles.sec}>Home language filter</Text>
        {getProfileHomeFilterOptions().map((f) => (
          <Pressable key={f} style={styles.filterRow} onPress={() => setHomeLanguageFilter(f)}>
            <Text style={styles.rowT}>{getLanguageLabel(f)}</Text>
            {homeLanguageFilter === f ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}

        <Pressable style={styles.signOut} onPress={() => void onSignOut()}>
          <Text style={styles.signOutTxt}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },
  title: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text.primary },
  muted: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing[2] },
  btn: { marginTop: spacing[6], alignSelf: 'flex-start', padding: spacing[3], backgroundColor: colors.brand.primary, borderRadius: borderRadius.md },
  btnTxt: { fontFamily: fonts.medium, color: colors.text.inverse },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  ini: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text.primary },
  un: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text.primary },
  handle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  em: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing[1] },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing[6] },
  stat: { alignItems: 'center' },
  statN: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.brand.light },
  statL: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.text.secondary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  rowT: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text.primary },
  rowE: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.brand.light },
  sec: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  check: { color: colors.brand.light, fontFamily: fonts.bold },
  signOut: { marginTop: spacing[10], alignItems: 'center' },
  signOutTxt: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.error },
});
