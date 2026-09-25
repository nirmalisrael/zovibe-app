import { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getUserPlaylists,
  addSongToPlaylist,
  createPlaylist,
  parseJsonArray,
  type MockAPIPlaylistRow,
} from '../../api/mockapi';
import type { JioSaavnSong } from '../../api/jiosaavn';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from '../../hooks/queryKeys';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

type Props = Readonly<{
  song: JioSaavnSong | null;
  onClose: () => void;
}>;

export function AddToPlaylistSheet({ song, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();
  const visible = song != null;

  const playlistsQ = useQuery({
    queryKey: queryKeys.playlists(userId ?? ''),
    queryFn: () => getUserPlaylists(userId!),
    enabled: visible && !!userId,
  });

  const addM = useMutation({
    mutationFn: async ({ playlistId, currentIds }: { playlistId: string; currentIds: string[] }) => {
      if (!song) throw new Error('No song');
      return addSongToPlaylist(playlistId, song.id, currentIds);
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') });
      void qc.invalidateQueries({ queryKey: queryKeys.playlist(vars.playlistId) });
      Alert.alert('Added', `"${song?.name ?? 'Track'}" was added to the playlist.`);
      onClose();
    },
    onError: () => {
      Alert.alert('Could not add', 'Please try again.');
    },
  });

  const createM = useMutation({
    mutationFn: () => createPlaylist(userId!, `New playlist ${new Date().toLocaleDateString()}`),
    onSuccess: async (row) => {
      void qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') });
      if (!song) return;
      const ids = parseJsonArray<string>(row.songIds, []);
      await addM.mutateAsync({ playlistId: row.id, currentIds: ids });
    },
    onError: () => Alert.alert('Could not create playlist', 'Please try again.'),
  });

  const data = playlistsQ.data ?? [];

  const header = useMemo(
    () => (
      <View style={[styles.sheetHeader, { paddingTop: Math.max(insets.top, spacing[3]) }]}>
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            Add to playlist
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.text.secondary} />
          </Pressable>
        </View>
        {song ? (
          <Text style={styles.sheetSub} numberOfLines={2}>
            {song.name}
          </Text>
        ) : null}
      </View>
    ),
    [insets.top, onClose, song]
  );

  const footer = useMemo(
    () => (
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        <Pressable
          style={[styles.createBtn, createM.isPending && styles.btnDisabled]}
          onPress={() => !createM.isPending && userId && createM.mutate()}
          disabled={createM.isPending || !userId}
        >
          {createM.isPending ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={22} color={colors.text.inverse} />
              <Text style={styles.createBtnTxt}>New playlist</Text>
            </>
          )}
        </Pressable>
      </View>
    ),
    [createM, insets.bottom, userId]
  );

  if (!visible || !song) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {header}
          {playlistsQ.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.brand.light} />
            </View>
          ) : playlistsQ.isError ? (
            <Text style={styles.err}>Could not load playlists.</Text>
          ) : (
            <FlatList<MockAPIPlaylistRow>
              data={data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.empty}>No playlists yet. Create one below.</Text>
              }
              renderItem={({ item }) => {
                const ids = parseJsonArray<string>(item.songIds, []);
                const already = ids.includes(song.id);
                const pendingId =
                  addM.isPending && addM.variables ? addM.variables.playlistId : undefined;
                const busy = pendingId === item.id;
                return (
                  <Pressable
                    style={({ pressed }) => [styles.plRow, pressed && styles.plRowPressed]}
                    onPress={() => {
                      if (already) {
                        Alert.alert('Already added', 'This track is already in that playlist.');
                        return;
                      }
                      addM.mutate({ playlistId: item.id, currentIds: ids });
                    }}
                    disabled={addM.isPending}
                  >
                    <Ionicons
                      name={already ? 'checkmark-circle' : 'musical-notes-outline'}
                      size={22}
                      color={already ? colors.brand.light : colors.text.tertiary}
                    />
                    <View style={styles.plMeta}>
                      <Text style={styles.plName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.plCount}>
                        {ids.length} {ids.length === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>
                    {busy ? <ActivityIndicator color={colors.brand.light} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
          {footer}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: Platform.OS === 'ios' ? '72%' : '78%',
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border.subtle,
  },
  sheetHeader: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    marginRight: spacing[2],
  },
  sheetSub: {
    marginTop: spacing[1],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  listContent: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    flexGrow: 1,
  },
  plRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  plRowPressed: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  plMeta: { flex: 1, minWidth: 0 },
  plName: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  plCount: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    padding: spacing[6],
    fontFamily: fonts.regular,
    color: colors.text.secondary,
  },
  err: {
    padding: spacing[4],
    textAlign: 'center',
    fontFamily: fonts.regular,
    color: colors.error,
  },
  centered: {
    padding: spacing[8],
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  btnDisabled: { opacity: 0.6 },
  createBtnTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.inverse,
  },
});
