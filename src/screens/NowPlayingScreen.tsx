import { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/playerStore';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { addRecentlyPlayed, parseJsonArray } from '../api/mockapi';
import type { JioSaavnSong } from '../api/jiosaavn';
import { CoverImage } from '../components/ui/CoverImage';
import { LanguageBadge } from '../components/ui/LanguageBadge';
import { ProgressBar } from '../components/player/ProgressBar';
import { PlayerControls } from '../components/player/PlayerControls';
import { formatTime } from '../utils/formatTime';
import { getAlbumNameSafe, getPrimaryArtistNames } from '../utils/songHelpers';
import { getCoverUrl } from '../api/stream';
import type { MainAppStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

type MainNav = NativeStackNavigationProp<MainAppStackParamList>;

function NowPlayingEmpty({
  paddingTop,
  paddingBottom,
  onClose,
}: Readonly<{ paddingTop: number; paddingBottom: number; onClose: () => void }>) {
  return (
    <View style={[styles.empty, { paddingTop, paddingBottom }]}>
      <Ionicons name="musical-notes-outline" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>Nothing playing</Text>
      <Text style={styles.emptySub}>Start a track from your library or home feed.</Text>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.closeChip, pressed && styles.closeChipPressed]}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="chevron-down" size={22} color={colors.text.inverse} />
        <Text style={styles.closeChipTxt}>Close</Text>
      </Pressable>
    </View>
  );
}

function NowPlayingMeta({
  current,
  userId,
  liked,
  canOpenArtist,
  canOpenAlbum,
  onLike,
  onArtist,
  onAlbum,
}: Readonly<{
  current: JioSaavnSong;
  userId: string | null;
  liked: boolean;
  canOpenArtist: boolean;
  canOpenAlbum: boolean;
  onLike: () => void;
  onArtist: () => void;
  onAlbum: () => void;
}>) {
  const artistLabel = getPrimaryArtistNames(current);
  const albumLabel = getAlbumNameSafe(current);

  return (
    <View style={styles.titleBlock}>
      <View style={styles.titleRow}>
        <View style={styles.titleTextCol}>
          <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
            {current.name}
          </Text>
          <Pressable
            onPress={onArtist}
            disabled={!canOpenArtist}
            style={({ pressed }) => [canOpenArtist && pressed ? styles.linkPressed : null]}
            accessibilityRole={canOpenArtist ? 'button' : 'text'}
            accessibilityLabel={canOpenArtist ? `Open artist ${artistLabel}` : undefined}
          >
            <Text
              style={[styles.artist, canOpenArtist ? styles.artistLink : styles.artistPlain]}
              numberOfLines={2}
            >
              {artistLabel}
              {canOpenArtist ? <Text style={styles.chevronHint}>  ›</Text> : null}
            </Text>
          </Pressable>
          <Pressable
            onPress={onAlbum}
            disabled={!canOpenAlbum}
            style={({ pressed }) => [canOpenAlbum && pressed ? styles.linkPressed : null]}
            accessibilityRole={canOpenAlbum ? 'button' : 'text'}
            accessibilityLabel={canOpenAlbum ? `Open album ${albumLabel}` : undefined}
          >
            <Text
              style={[styles.albumLine, canOpenAlbum ? styles.albumLink : styles.albumPlain]}
              numberOfLines={1}
            >
              {albumLabel}
              {canOpenAlbum ? <Text style={styles.chevronHint}>  ›</Text> : null}
            </Text>
          </Pressable>
          <View style={styles.badgeRow}>
            <LanguageBadge language={current.language || 'music'} />
          </View>
        </View>
        {userId ? (
          <Pressable
            onPress={onLike}
            hitSlop={12}
            style={({ pressed }) => [styles.likeWrap, pressed && styles.hitPressed]}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Remove from liked songs' : 'Add to liked songs'}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? colors.accent.pink : colors.text.secondary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function NowPlayingScreen() {
  const navigation = useNavigation<MainNav>();
  const insets = useSafeAreaInsets();
  const current = usePlayerStore((s) => s.currentSong);
  const queue = usePlayerStore((s) => s.queue);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const userId = useAuthStore((s) => s.userId);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const { position, duration, isPlaying } = useNowPlaying(500);
  const { togglePlay, skipToNext, skipToPrevious, seekTo, cycleRepeat, toggleShuffle } =
    usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();

  const queueIndex = useMemo(
    () => (current ? queue.findIndex((s) => s.id === current.id) : -1),
    [queue, current]
  );
  const queueLabel =
    queue.length > 0 && queueIndex >= 0
      ? `Track ${queueIndex + 1} of ${queue.length}`
      : null;

  const primaryArtist = current?.artists?.primary?.[0];
  const canOpenArtist = Boolean(primaryArtist?.id);
  const canOpenAlbum = Boolean(current?.album?.id);

  const goToArtist = useCallback(() => {
    if (primaryArtist?.id == null) return;
    navigation.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'Artist', params: { artistId: primaryArtist.id } },
    });
    navigation.goBack();
  }, [navigation, primaryArtist?.id]);

  const goToAlbum = useCallback(() => {
    if (current?.album?.id == null) return;
    navigation.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'Album', params: { albumId: current.album.id } },
    });
    navigation.goBack();
  }, [navigation, current?.album?.id]);

  useEffect(() => {
    if (!current || !userId || !user) return;
    const ids = parseJsonArray<string>(user.recentlyPlayed, []);
    void (async () => {
      try {
        const updated = await addRecentlyPlayed(userId, current.id, ids);
        refreshUser(updated);
      } catch {
        /* ignore */
      }
    })();
  }, [current?.id, userId, user, refreshUser]);

  if (!current) {
    return (
      <NowPlayingEmpty
        paddingTop={insets.top + spacing[4]}
        paddingBottom={insets.bottom}
        onClose={() => navigation.goBack()}
      />
    );
  }

  const art = getCoverUrl(current, '500x500');
  const liked = isLiked(current.id);
  const scrollBottom = Math.max(insets.bottom, spacing[4]) + spacing[6];

  const blurBody = (
    <BlurView
      intensity={Platform.OS === 'ios' ? 42 : 56}
      tint="dark"
      blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      style={[styles.blur, { paddingHorizontal: layout.screenPadding }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, spacing[2]),
            paddingBottom: scrollBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        <View style={styles.top}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={14}
            style={({ pressed }) => [styles.iconHit, pressed && styles.hitPressed]}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="chevron-down" size={28} color={colors.text.primary} />
          </Pressable>
          <View style={styles.topCenter}>
            {queueLabel ? (
              <Text style={styles.kicker} numberOfLines={1}>
                {queueLabel}
              </Text>
            ) : null}
            <Text style={styles.nowPlayingLabel} numberOfLines={1}>
              Now playing
            </Text>
          </View>
          <View style={styles.iconHit} />
        </View>

        <CoverImage uri={art || undefined} size={260} radius={borderRadius.xl} />

        <NowPlayingMeta
          current={current}
          userId={userId}
          liked={liked}
          canOpenArtist={canOpenArtist}
          canOpenAlbum={canOpenAlbum}
          onLike={() => toggleLike(current.id, liked)}
          onArtist={goToArtist}
          onAlbum={goToAlbum}
        />

        <ProgressBar duration={duration} position={position} onSeek={(s) => seekTo(s)} />

        <View style={styles.times}>
          <Text style={styles.t}>{formatTime(position)}</Text>
          <Text style={styles.t}>{formatTime(duration)}</Text>
        </View>

        <PlayerControls
          isPlaying={isPlaying}
          shuffle={shuffle}
          repeat={repeat}
          onPrev={() => skipToPrevious()}
          onNext={() => skipToNext()}
          onTogglePlay={() => togglePlay()}
          onShuffle={toggleShuffle}
          onRepeat={() => cycleRepeat()}
        />

        {current.hasLyrics ? (
          <Pressable
            style={({ pressed }) => [styles.lyricsBtn, pressed && styles.lyricsBtnPressed]}
            onPress={() => navigation.navigate('Lyrics', { songId: current.id })}
            accessibilityRole="button"
            accessibilityLabel="Open lyrics"
          >
            <Ionicons name="text-outline" size={20} color={colors.brand.light} />
            <Text style={styles.lyricsTxt}>Lyrics</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </Pressable>
        ) : null}
      </ScrollView>
    </BlurView>
  );

  return (
    <View style={styles.root}>
      {art ? (
        <ImageBackground source={{ uri: art }} style={styles.bg} blurRadius={28}>
          {blurBody}
        </ImageBackground>
      ) : (
        <View style={[styles.bg, styles.fallbackBg]}>{blurBody}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  bg: { flex: 1, width: '100%' },
  fallbackBg: {
    backgroundColor: colors.bg.secondary,
  },
  blur: { flex: 1 },
  scroll: { alignItems: 'center' },
  top: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  topCenter: { flex: 1, alignItems: 'center', paddingHorizontal: spacing[2] },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nowPlayingLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitPressed: { opacity: 0.7 },
  titleBlock: { width: '100%', marginTop: spacing[5] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  titleTextCol: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    lineHeight: 28,
  },
  artist: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    marginTop: spacing[2],
  },
  artistLink: {
    color: colors.brand.light,
  },
  artistPlain: {
    color: colors.text.secondary,
  },
  albumLine: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    marginTop: spacing[1],
  },
  albumLink: { color: colors.text.secondary },
  albumPlain: { color: colors.text.tertiary },
  chevronHint: {
    color: colors.text.tertiary,
    fontFamily: fonts.regular,
  },
  linkPressed: { opacity: 0.75 },
  badgeRow: { marginTop: spacing[3], alignSelf: 'flex-start' },
  likeWrap: {
    marginTop: spacing[1],
    padding: spacing[1],
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: -spacing[2],
    paddingHorizontal: spacing[1],
  },
  t: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.text.tertiary },
  lyricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    width: '100%',
    justifyContent: 'center',
  },
  lyricsBtnPressed: { opacity: 0.88 },
  lyricsTxt: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light, flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
    paddingHorizontal: layout.screenPadding,
    gap: spacing[2],
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    marginTop: spacing[3],
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  closeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.full,
    backgroundColor: colors.brand.primary,
  },
  closeChipPressed: { opacity: 0.9 },
  closeChipTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.inverse,
  },
});
