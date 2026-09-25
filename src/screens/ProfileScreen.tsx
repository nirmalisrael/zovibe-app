import {
  memo,
  useCallback,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { deleteSecure, KEY_USER_ID } from '../utils/storage';
import { getUserPlaylists, parseJsonArray } from '../api/mockapi';
import { queryKeys } from '../hooks/queryKeys';
import type { ProfileStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';
import { navigationRef } from '../navigation/navigationRef';
import { displayNameOrUsername, resolveUserAvatar } from '../entities';

// ─── Stat Pill ────────────────────────────────────────────────────────────────

const StatPill = memo(function StatPill({
  icon,
  value,
  label,
  accentColor = colors.brand.light,
}: Readonly<{
  icon: ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  accentColor?: string;
}>) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.statPill, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.statPillInner}
        accessibilityRole="text"
        accessibilityLabel={`${label}: ${value}`}
      >
        <View style={[styles.statPillIconWrap, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name={icon} size={18} color={accentColor} />
        </View>
        <Text style={styles.statPillValue}>{value}</Text>
        <Text style={styles.statPillLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

// ─── Settings Row ─────────────────────────────────────────────────────────────

const SettingsRow = memo(function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  iconBg = 'rgba(139, 92, 246, 0.14)',
  iconColor = colors.brand.light,
}: Readonly<{
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  right?: ReactNode;
  iconBg?: string;
  iconColor?: string;
}>) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(0)).current;

  const onPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 40 }),
      Animated.timing(bg, { toValue: 1, duration: 100, useNativeDriver: false }),
    ]).start();
  }, [scale, bg]);

  const onPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25, bounciness: 4 }),
      Animated.timing(bg, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [scale, bg]);

  const animatedBg = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(139, 92, 246, 0.0)', 'rgba(139, 92, 246, 0.08)'],
  });

  return (
    <Animated.View style={{ transform: [{ scale }], backgroundColor: animatedBg }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.settingsRow}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={[styles.settingsRowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.settingsRowText}>
          <Text style={styles.settingsRowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.settingsRowSub}>{subtitle}</Text> : null}
        </View>
        {right ?? (
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeading}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
});

// ─── Card Wrapper ─────────────────────────────────────────────────────────────

const Card = memo(function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
});

// ─── Guest View ───────────────────────────────────────────────────────────────

const GuestView = memo(function GuestView({ onPress }: { onPress: () => void }) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollGuest}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>Profile</Text>
      <Text style={styles.pageSub}>Account and listening preferences</Text>

      <Card style={styles.guestCard}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.16)', 'rgba(139, 92, 246, 0.03)']}
          style={styles.guestGradient}
        />
        <View style={styles.guestIconRing}>
          <Ionicons name="person-outline" size={38} color={colors.brand.light} />
        </View>
        <Text style={styles.guestHeadline}>Browsing as Guest</Text>
        <Text style={styles.guestCopy}>
          Sign in to sync playlists, liked songs, and history across all your devices.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Go to sign in"
        >
          <LinearGradient
            colors={[colors.brand.primary, colors.brand.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtnGradient}
          >
            <Text style={styles.primaryBtnTxt}>Sign in</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />
          </LinearGradient>
        </Pressable>
      </Card>
    </ScrollView>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const logout = useAuthStore((s) => s.logout);
  const audioQuality = useSettingsStore((s) => s.audioQuality);
  const setAudioQuality = useSettingsStore((s) => s.setAudioQuality);

  const likedCount = useMemo(
    () => (user ? parseJsonArray<string>(user.likedSongs, []).length : 0),
    [user?.likedSongs],
  );
  const historyCount = useMemo(
    () => (user ? parseJsonArray<string>(user.recentlyPlayed, []).length : 0),
    [user?.recentlyPlayed],
  );
  const memberSince = useMemo(() => {
    if (!user?.createdAt) return '';
    try {
      return new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }, [user?.createdAt]);

  const playlistsQ = useQuery({
    queryKey: queryKeys.playlists(user?.id ?? ''),
    queryFn: () => getUserPlaylists(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const playlistsCount = playlistsQ.data?.length ?? 0;

  const goToLogin = useCallback(() => {
    useAuthStore.getState().logout();
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, []);

  const onSignOut = useCallback(async () => {
    await deleteSecure(KEY_USER_ID);
    logout();
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [logout]);

  const requestSignOut = useCallback(() => {
    Alert.alert(
      'Sign out?',
      "You'll need to sign in again to access your playlists and saved music.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void onSignOut(),
        },
      ],
      { cancelable: true },
    );
  }, [onSignOut]);

  const openPrefs = useCallback(() => {
    navigation.navigate('OnboardingPrefs');
  }, [navigation]);

  const onAudioToggle = useCallback(
    (high: boolean) => setAudioQuality(high ? 'high' : 'normal'),
    [setAudioQuality],
  );

  if (isGuest) {
    return (
      <ScreenWrapper style={styles.screenEdge}>
        <GuestView onPress={goToLogin} />
      </ScreenWrapper>
    );
  }

  if (!user) {
    return (
      <ScreenWrapper style={styles.screenEdge}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand.light} />
          <Text style={styles.loadingTxt}>Loading profile…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const displayName = displayNameOrUsername(user);
  const initials = resolveUserAvatar(user);

  return (
    <ScreenWrapper style={styles.screenEdge}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page heading ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Profile</Text>
            <Text style={styles.pageSub}>Account & preferences</Text>
          </View>
        </View>

        {/* ── Profile card ── */}
        <Card style={styles.profileCard}>
          {/* Decorative gradient backdrop */}
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.18)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
          <View style={styles.avatarRing}>
            <LinearGradient
              colors={[colors.brand.primary, colors.brand.light, colors.brand.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradientBorder}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initials}</Text>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.handle}>@{user.username}</Text>

          <View style={styles.profileMetaRow}>
            <View style={styles.profileMetaItem}>
              <Ionicons name="mail-outline" size={13} color={colors.text.tertiary} />
              <Text style={styles.profileMetaTxt} numberOfLines={1}>{user.email}</Text>
            </View>
            {memberSince ? (
              <View style={styles.profileMetaDivider} />
            ) : null}
            {memberSince ? (
              <View style={styles.profileMetaItem}>
                <Ionicons name="calendar-outline" size={13} color={colors.text.tertiary} />
                <Text style={styles.profileMetaTxt}>Since {memberSince}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* ── Library stats ── */}
        <SectionHeader label="Your Library" />
        <View style={styles.statsRow}>
          <StatPill icon="heart" value={likedCount} label="Liked" accentColor="#f472b6" />
          <StatPill icon="albums-outline" value={playlistsCount} label="Playlists" accentColor={colors.brand.light} />
          <StatPill icon="time-outline" value={historyCount} label="History" accentColor="#34d399" />
        </View>

        {/* ── Preferences ── */}
        <SectionHeader label="Preferences" />
        <Card style={styles.prefCard}>
          <SettingsRow
            icon="language-outline"
            title="Language & Home Feed"
            subtitle="Content you see and hear first"
            onPress={openPrefs}
          />
          <View style={styles.cardDivider} />

          {/* Audio quality row — inline, not a Pressable */}
          <View style={styles.audioBlock}>
            <View style={[styles.settingsRowIcon, { backgroundColor: 'rgba(139, 92, 246, 0.14)' }]}>
              <Ionicons name="musical-notes-outline" size={20} color={colors.brand.light} />
            </View>
            <View style={styles.settingsRowText}>
              <Text style={styles.settingsRowTitle}>Streaming Quality</Text>
              <Text style={styles.settingsRowSub}>
                {audioQuality === 'high'
                  ? 'High — 320 kbps · uses more data'
                  : 'Normal — saves data'}
              </Text>
            </View>
            <Switch
              value={audioQuality === 'high'}
              onValueChange={onAudioToggle}
              trackColor={{ true: colors.brand.primary, false: colors.bg.tertiary }}
              thumbColor={Platform.OS === 'android' ? colors.text.primary : undefined}
              ios_backgroundColor={colors.bg.tertiary}
              accessibilityLabel="High quality streaming"
            />
          </View>

          {/* <View style={styles.cardDivider} />
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="New releases and recommendations"
            onPress={() => { }}
            iconBg="rgba(251, 191, 36, 0.15)"
            iconColor="#fbbf24"
          /> */}
        </Card>

        {/* ── Account ── */}
        {/* <SectionHeader label="Account" />
        <Card>
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Manage your data"
            onPress={() => { }}
            iconBg="rgba(52, 211, 153, 0.15)"
            iconColor="#34d399"
          />
          <View style={styles.cardDivider} />
          <SettingsRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="FAQs and contact"
            onPress={() => { }}
            iconBg="rgba(99, 102, 241, 0.15)"
            iconColor="#818cf8"
          />
        </Card> */}

        {/* ── Sign Out ── */}
        <Pressable
          style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.7 }]}
          onPress={requestSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <View style={styles.signOutIcon}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
          </View>
          <Text style={styles.signOutTxt}>Sign out</Text>
        </Pressable>

        <Text style={styles.versionHint}>ZoVibe · v1.0.0</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenEdge: {
    paddingHorizontal: 0,
  },

  // ── Scroll containers ──
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing[10],
  },
  scrollGuest: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[2],
    paddingBottom: layout.tabBarHeight + spacing[10],
  },

  // ── Page header ──
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing[5],
  },
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize['3xl'],
    color: colors.text.primary,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  pageSub: {
    marginTop: spacing[1],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },

  // ── Card shell ──
  card: {
    borderRadius: borderRadius.lg + 2,
    backgroundColor: colors.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing[6],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginLeft: 60,
    marginRight: spacing[3],
  },

  // ── Profile card ──
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[7],
  },
  avatarRing: {
    marginBottom: spacing[4],
  },
  avatarGradientBorder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 87,
    height: 87,
    borderRadius: 43.5,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: {
    fontFamily: fonts.bold,
    fontSize: fontSize['2xl'],
    color: colors.text.primary,
    letterSpacing: 1,
  },
  displayName: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  handle: {
    marginTop: spacing[1],
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.brand.light,
    opacity: 0.75,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    gap: spacing[3],
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  profileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  profileMetaTxt: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    maxWidth: 160,
  },
  profileMetaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.tertiary,
    opacity: 0.4,
  },

  // ── Section headers ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(124,58,237,0.18)',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[7],
  },
  statPill: {
    flex: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  statPillInner: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    gap: spacing[1],
  },
  statPillIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  statPillValue: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  statPillLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },

  // ── Preferences card ──
  prefCard: {
    // inherits card styles
  },

  // ── Settings rows ──
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  settingsRowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowText: {
    flex: 1,
    minWidth: 0,
  },
  settingsRowTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },
  settingsRowSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: 16,
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Audio block ──
  audioBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },

  // ── Sign out ──
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    marginBottom: spacing[4],
    marginTop: spacing[2],
  },
  signOutIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.error,
    letterSpacing: 0.1,
  },
  versionHint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing[4],
    opacity: 0.5,
    letterSpacing: 0.5,
  },

  // ── Guest screen ──
  guestCard: {
    marginTop: spacing[4],
    alignItems: 'center',
    padding: spacing[7],
    overflow: 'hidden',
  },
  guestGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  guestIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  guestHeadline: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  guestCopy: {
    marginTop: spacing[2],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  primaryBtn: {
    marginTop: spacing[6],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[7],
  },
  primaryBtnTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  loadingTxt: {
    marginTop: spacing[4],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});