import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserPlaylists,
  parseJsonArray,
  updatePlaylist,
  deletePlaylist,
  removeSongFromPlaylist,
  type MockAPIPlaylistRow,
} from '../api/mockapi';
import { getSongById } from '../api/jiosaavn';
import type { JioSaavnSong } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { PlaylistDetailSkeleton, SongRowSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { SongRow } from '../components/cards/SongRow';
import { useAuthStore } from '../store/authStore';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { queryKeys } from '../hooks/queryKeys';
import type { LibraryStackParamList, MainTabParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

export function PlaylistScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const { playlistId } = route.params as { playlistId: string };
  const userId = useAuthStore((s) => s.userId);
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const playlistsQ = useQuery({
    queryKey: queryKeys.playlists(userId ?? ''),
    queryFn: () => getUserPlaylists(userId!),
    enabled: !!userId,
  });

  const row = playlistsQ.data?.find((p) => p.id === playlistId);

  const ids = row ? parseJsonArray<string>(row.songIds, []) : [];

  const songsQ = useQuery({
    queryKey: queryKeys.playlist(playlistId),
    queryFn: async () => {
      const out: JioSaavnSong[] = [];
      for (const id of ids) {
        const s = await getSongById(id);
        if (s) out.push(s);
      }
      return out;
    },
    enabled: ids.length > 0,
  });

  const renameM = useMutation({
    mutationFn: (name: string) => updatePlaylist(playlistId, { name }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') });
      setEditing(false);
    },
  });

  const removeM = useMutation({
    mutationFn: (songId: string) => removeSongFromPlaylist(playlistId, songId, ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') });
      void qc.invalidateQueries({ queryKey: queryKeys.playlist(playlistId) });
    },
  });

  const delM = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') });
      navigation.goBack();
    },
  });

  if (playlistsQ.isLoading || !row) {
    return (
      <ScreenWrapper style={{ paddingHorizontal: 0 }}>
        <PlaylistDetailSkeleton />
      </ScreenWrapper>
    );
  }

  const songs = songsQ.data ?? [];

  const tabNav = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  const goDiscoverMusic = () => {
    tabNav?.navigate('ExploreTab', { screen: 'ExploreMain' });
  };

  const refreshing = playlistsQ.isFetching || songsQ.isFetching;
  const onRefresh = () => {
    void playlistsQ.refetch();
    if (ids.length > 0) void songsQ.refetch();
  };

  return (
    <ScreenWrapper style={{ paddingHorizontal: 0 }}>
      <View style={[styles.top, { paddingHorizontal: layout.screenPadding }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={nameDraft || row.name}
              onChangeText={setNameDraft}
            />
            <Pressable onPress={() => renameM.mutate(nameDraft.trim() || row.name)}>
              <Text style={styles.save}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{row.name}</Text>
              <Text style={styles.trackCount}>
                {ids.length} {ids.length === 1 ? 'track' : 'tracks'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setNameDraft(row.name);
                setEditing(true);
              }}
            >
              <Ionicons name="pencil" size={20} color={colors.brand.light} />
            </Pressable>
          </View>
        )}
        <Pressable
          style={styles.del}
          onPress={() =>
            Alert.alert('Delete playlist', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => delM.mutate() },
            ])
          }
        >
          <Text style={styles.delTxt}>Delete playlist</Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.actBtn} onPress={() => songs.length && void playQueue(songs, 0)}>
            <Text style={styles.actTxt}>Play all</Text>
          </Pressable>
          <Pressable
            style={styles.actBtnGhost}
            onPress={() => {
              if (songs.length < 2) return;
              void playQueue([...songs].sort(() => Math.random() - 0.5), 0);
            }}
          >
            <Text style={styles.actTxtGhost}>Shuffle</Text>
          </Pressable>
        </View>
      </View>
      {ids.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No songs in this playlist yet.</Text>
          <Pressable style={styles.discoverBtn} onPress={goDiscoverMusic}>
            <Text style={styles.discoverTxt}>Discover music</Text>
          </Pressable>
        </View>
      ) : songsQ.isLoading ? (
        <View style={{ paddingHorizontal: layout.screenPadding, paddingBottom: 120 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <SongRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList<JioSaavnSong>
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand.light}
            />
          }
          renderItem={({ item }) => (
            <SongRow
              song={item}
              onPress={() => {
                const i = songs.findIndex((x) => x.id === item.id);
                void playQueue(songs, Math.max(0, i));
              }}
              liked={isLiked(item.id)}
              onToggleLike={() => user && void toggleLike(item.id, isLiked(item.id))}
              showLike={!!user}
              showAddToPlaylist={!!user}
              onAddToPlaylist={() => openAddToPlaylist(item)}
              onLongPress={() =>
                Alert.alert('Remove song', 'Remove from this playlist?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', onPress: () => removeM.mutate(item.id) },
                ])
              }
            />
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  top: { marginBottom: spacing[4] },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    padding: spacing[2],
  },
  save: { fontFamily: fonts.medium, color: colors.brand.light },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginTop: spacing[2] },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text.primary },
  trackCount: {
    marginTop: spacing[1],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  del: { marginTop: spacing[3] },
  delTxt: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.error },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  actBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  actTxt: { fontFamily: fonts.medium, color: colors.text.inverse },
  actBtnGhost: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  actTxtGhost: { fontFamily: fonts.medium, color: colors.brand.light },
  emptyWrap: { paddingHorizontal: layout.screenPadding, paddingVertical: spacing[6], alignItems: 'center' },
  empty: { fontFamily: fonts.regular, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[4] },
  discoverBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  discoverTxt: { fontFamily: fonts.medium, color: colors.text.inverse },
});
