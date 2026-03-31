import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, TextInput, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserPlaylists,
  parseJsonArray,
  updatePlaylist,
  deletePlaylist,
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
import { queryKeys } from '../hooks/queryKeys';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

export function PlaylistScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { playlistId } = route.params as { playlistId: string };
  const userId = useAuthStore((s) => s.userId);
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
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
    mutationFn: (songId: string) => {
      const next = ids.filter((id) => id !== songId);
      return updatePlaylist(playlistId, { songIds: JSON.stringify(next) });
    },
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
            <Text style={styles.title}>{row.name}</Text>
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
        <Text style={styles.empty}>No songs in this playlist.</Text>
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
              onLongPress={() =>
                Alert.alert('Remove song', 'Remove from playlist?', [
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[2] },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text.primary },
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
  empty: { padding: spacing[6], fontFamily: fonts.regular, color: colors.text.secondary, textAlign: 'center' },
});
