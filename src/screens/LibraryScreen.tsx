import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { LibraryPlaylistSkeleton, SongRowSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { PlaylistCard } from '../components/cards/PlaylistCard';
import { SongRow } from '../components/cards/SongRow';
import { getUserPlaylists, createPlaylist, parseJsonArray, type MockAPIPlaylistRow } from '../api/mockapi';
import { getSongById } from '../api/jiosaavn';
import type { JioSaavnSong } from '../api/jiosaavn';
import { useAuthStore } from '../store/authStore';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { queryKeys } from '../hooks/queryKeys';
import type { LibraryStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

type Tab = 'playlists' | 'liked' | 'history';

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const userId = useAuthStore((s) => s.userId);
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [tab, setTab] = useState<Tab>('playlists');
  const qc = useQueryClient();
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();

  const playlistsQ = useQuery({
    queryKey: queryKeys.playlists(userId ?? ''),
    queryFn: () => getUserPlaylists(userId!),
    enabled: !!userId && !isGuest,
  });

  const createM = useMutation({
    mutationFn: () =>
      createPlaylist(userId!, `Playlist ${new Date().toLocaleString()}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') }),
  });

  const likedIds = user ? parseJsonArray<string>(user.likedSongs, []) : [];
  const historyIds = user ? parseJsonArray<string>(user.recentlyPlayed, []) : [];

  const likedSongsQ = useQuery({
    queryKey: queryKeys.likedSongs(likedIds.join(',')),
    queryFn: async () => {
      const out: JioSaavnSong[] = [];
      for (const id of likedIds.slice(0, 50)) {
        const s = await getSongById(id);
        if (s) out.push(s);
      }
      return out;
    },
    enabled: !!userId && tab === 'liked' && likedIds.length > 0,
  });

  const historyQ = useQuery({
    queryKey: queryKeys.likedSongs(`h-${historyIds.join(',')}`),
    queryFn: async () => {
      const out: JioSaavnSong[] = [];
      for (const id of historyIds.slice(0, 50)) {
        const s = await getSongById(id);
        if (s) out.push(s);
      }
      return out;
    },
    enabled: !!userId && tab === 'history' && historyIds.length > 0,
  });

  if (isGuest || !userId) {
    return (
      <ScreenWrapper>
        <ErrorState message="Sign in to use your library, playlists, and likes." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={{ paddingHorizontal: 0 }}>
        <View style={[styles.pills, { paddingHorizontal: layout.screenPadding }]}>
          {(['playlists', 'liked', 'history'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.pill, tab === t && styles.pillOn]}>
              <Text style={[styles.pillTxt, tab === t && styles.pillTxtOn]}>
                {t === 'playlists' ? 'My Playlists' : t === 'liked' ? 'Liked Songs' : 'History'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'playlists' ? (
          playlistsQ.isLoading ? (
            <LibraryPlaylistSkeleton />
          ) : playlistsQ.isError ? (
            <ErrorState message="Could not load playlists" onRetry={() => void playlistsQ.refetch()} />
          ) : (
            <FlatList<MockAPIPlaylistRow>
              contentContainerStyle={styles.list}
              data={playlistsQ.data ?? []}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.empty}>No playlists yet. Tap + to create one.</Text>
              }
              renderItem={({ item }) => (
                <PlaylistCard
                  playlist={item}
                  onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}
                />
              )}
            />
          )
        ) : null}

        {tab === 'liked' ? (
          likedIds.length === 0 ? (
            <Text style={styles.empty}>Like songs from the player to see them here.</Text>
          ) : likedSongsQ.isLoading ? (
            <View style={{ paddingHorizontal: layout.screenPadding }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SongRowSkeleton key={i} />
              ))}
            </View>
          ) : (
            <FlatList<JioSaavnSong>
              contentContainerStyle={styles.list}
              data={likedSongsQ.data ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SongRow
                  song={item}
                  onPress={() => void playQueue([item], 0)}
                  liked={isLiked(item.id)}
                  onToggleLike={() => void toggleLike(item.id, true)}
                  showLike
                />
              )}
            />
          )
        ) : null}

        {tab === 'history' ? (
          historyIds.length === 0 ? (
            <Text style={styles.empty}>Play music to build your history.</Text>
          ) : historyQ.isLoading ? (
            <View style={{ paddingHorizontal: layout.screenPadding }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SongRowSkeleton key={i} />
              ))}
            </View>
          ) : (
            <FlatList<JioSaavnSong>
              contentContainerStyle={styles.list}
              data={historyQ.data ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SongRow
                  song={item}
                  onPress={() => void playQueue([item], 0)}
                  liked={isLiked(item.id)}
                  onToggleLike={() => void toggleLike(item.id, isLiked(item.id))}
                  showLike
                />
              )}
            />
          )
        ) : null}

        {tab === 'playlists' ? (
          <Pressable
            style={styles.fab}
            onPress={() => createM.mutate()}
            disabled={createM.isPending}
          >
            <Ionicons name="add" size={32} color={colors.text.inverse} />
          </Pressable>
        ) : null}
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  pills: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillOn: { borderColor: colors.brand.primary },
  pillTxt: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.text.secondary },
  pillTxtOn: { color: colors.brand.light },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: 120 },
  empty: {
    padding: spacing[6],
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
