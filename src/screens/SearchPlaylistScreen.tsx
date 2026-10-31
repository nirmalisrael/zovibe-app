import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPlaylistById } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { CoverImage } from '../components/ui/CoverImage';
import { ErrorState } from '../components/ui/ErrorState';
import { SongRow } from '../components/cards/SongRow';
import { SongRowSkeleton } from '../components/ui/PageSkeletons';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../hooks/queryKeys';
import type { ExploreStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius } from '../theme';

export function SearchPlaylistScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const { playlistId } = route.params as ExploreStackParamList['SearchPlaylist'];
  const user = useAuthStore((state) => state.user);
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const playlistQuery = useQuery({
    queryKey: queryKeys.searchPlaylist(playlistId),
    queryFn: () => getPlaylistById(playlistId),
    enabled: !!playlistId,
    staleTime: 5 * 60 * 1000,
  });

  const playlist = playlistQuery.data;
  const songs = playlist?.songs ?? [];

  if (playlistQuery.isPending) {
    return (
      <ScreenWrapper>
        <SongRowSkeleton />
        <SongRowSkeleton />
        <SongRowSkeleton />
      </ScreenWrapper>
    );
  }

  if (playlistQuery.isError || !playlist) {
    return (
      <ScreenWrapper>
        <ErrorState
          message="Could not load this playlist."
          onRetry={() => void playlistQuery.refetch()}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>

        <View style={styles.hero}>
          <CoverImage
            uri={playlist.image?.at(-1)?.url}
            size={176}
            radius={borderRadius.xl}
          />
          <Text style={styles.title}>{playlist.name}</Text>
          <Text style={styles.meta}>
            {playlist.songCount ?? songs.length} songs
            {playlist.language ? ` · ${playlist.language}` : ''}
          </Text>
          {playlist.description ? (
            <Text style={styles.description}>{playlist.description}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
            onPress={() => {
              if (songs.length > 0) void playQueue(songs, 0);
            }}
            disabled={songs.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Play playlist"
          >
            <Ionicons name="play" size={18} color={colors.text.inverse} />
            <Text style={styles.playButtonText}>Play playlist</Text>
          </Pressable>
        </View>

        {songs.length > 0 ? (
          songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index + 1}
              onPress={() => void playQueue(songs, index)}
              liked={isLiked(song.id)}
              onToggleLike={() => {
                if (user) void toggleLike(song.id, isLiked(song.id));
              }}
              showLike={!!user}
              showAddToPlaylist={!!user}
              onAddToPlaylist={() => openAddToPlaylist(song)}
            />
          ))
        ) : (
          <Text style={styles.empty}>This playlist has no playable songs.</Text>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  content: { paddingHorizontal: spacing[4], paddingBottom: 120 },
  back: { alignSelf: 'flex-start', marginBottom: spacing[3] },
  hero: { alignItems: 'center', marginBottom: spacing[5] },
  title: {
    marginTop: spacing[4],
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    textAlign: 'center',
  },
  meta: {
    marginTop: spacing[1],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  description: {
    marginTop: spacing[3],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  playButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    alignSelf: 'stretch',
    marginTop: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: colors.brand.primary,
  },
  playButtonText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.text.inverse,
  },
  empty: {
    paddingVertical: spacing[5],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  pressed: { opacity: 0.75 },
});
