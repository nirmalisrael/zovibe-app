import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { addRecentlyPlayed, parseJsonArray } from '../api/mockapi';
import { CoverImage } from '../components/ui/CoverImage';
import { LanguageBadge } from '../components/ui/LanguageBadge';
import { ProgressBar } from '../components/player/ProgressBar';
import { PlayerControls } from '../components/player/PlayerControls';
import { VolumeSlider } from '../components/player/VolumeSlider';
import { formatTime } from '../utils/formatTime';
import { getPrimaryArtistNames } from '../utils/songHelpers';
import { getCoverUrl } from '../api/stream';
import type { MainAppStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

export function NowPlayingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainAppStackParamList>>();
  const current = usePlayerStore((s) => s.currentSong);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const userId = useAuthStore((s) => s.userId);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const { position, duration, isPlaying } = useNowPlaying(500);
  const { togglePlay, skipToNext, skipToPrevious, seekTo, cycleRepeat, toggleShuffle } =
    usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const [vol, setVol] = useState(1);

  useEffect(() => {
    void TrackPlayer.getVolume().then(setVol);
  }, []);

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
      <View style={styles.empty}>
        <Text style={styles.muted}>Nothing playing</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const art = getCoverUrl(current, '500x500');
  const liked = isLiked(current.id);

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: art }} style={styles.bg} blurRadius={25}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.top}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
              </Pressable>
              <Pressable hitSlop={12}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.text.primary} />
              </Pressable>
            </View>
            <CoverImage uri={art} size={240} radius={borderRadius.xl} />
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{current.name}</Text>
                <Text style={styles.artist}>{getPrimaryArtistNames(current)}</Text>
                <LanguageBadge language={current.language || 'music'} />
              </View>
              {userId ? (
                <Pressable onPress={() => void toggleLike(current.id, liked)}>
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={26}
                    color={liked ? colors.accent.pink : colors.text.secondary}
                  />
                </Pressable>
              ) : null}
            </View>
            <ProgressBar duration={duration} position={position} onSeek={(s) => void seekTo(s)} />
            <View style={styles.times}>
              <Text style={styles.t}>{formatTime(position)}</Text>
              <Text style={styles.t}>{formatTime(duration)}</Text>
            </View>
            <PlayerControls
              isPlaying={isPlaying}
              shuffle={shuffle}
              repeat={repeat}
              onPrev={() => void skipToPrevious()}
              onNext={() => void skipToNext()}
              onTogglePlay={() => void togglePlay()}
              onShuffle={toggleShuffle}
              onRepeat={() => void cycleRepeat()}
            />
            <VolumeSlider
              value={vol}
              onChange={(v) => {
                setVol(v);
                void TrackPlayer.setVolume(v);
              }}
            />
            {current.hasLyrics ? (
              <Pressable
                style={styles.lyricsBtn}
                onPress={() => navigation.navigate('Lyrics', { songId: current.id })}
              >
                <Ionicons name="text-outline" size={20} color={colors.brand.light} />
                <Text style={styles.lyricsTxt}>Lyrics</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </BlurView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  bg: { flex: 1, width: '100%' },
  blur: { flex: 1, paddingHorizontal: layout.screenPadding },
  scroll: { paddingBottom: 48, alignItems: 'center' },
  top: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
  },
  artist: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: spacing[6],
    gap: spacing[3],
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing[1],
  },
  t: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.text.tertiary },
  lyricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
  },
  lyricsTxt: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary },
  muted: { color: colors.text.secondary, fontFamily: fonts.regular },
  link: { marginTop: spacing[4], color: colors.brand.light, fontFamily: fonts.medium },
});
