import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MOODS, type MoodType } from '../constants/moods';
import { getLanguageQuerySuffix } from '../constants/languages';
import { searchAll } from '../api/jiosaavn';
import type { JioSaavnSong } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { SongRowSkeleton } from '../components/ui/PageSkeletons';
import { SongRow } from '../components/cards/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { colors, fonts, fontSize, spacing } from '../theme';

export function MoodScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { mood } = route.params as { mood: MoodType };
  const meta = MOODS[mood];
  const homeLanguageFilter = useSettingsStore((s) => s.homeLanguageFilter);
  const langSuffix = getLanguageQuerySuffix(homeLanguageFilter);
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['mood', mood] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, mood]);

  /** Same discovery path as Explore genres + SearchResults (`/api/search`), not `/api/search/songs` (shape varies on some hosts). */
  const results = useQueries({
    queries: meta.searches.map((q) => {
      const fullQ = `${q}${langSuffix}`.trim();
      return {
        queryKey: ['mood', mood, homeLanguageFilter, fullQ] as const,
        queryFn: async () => {
          const { songs } = await searchAll(fullQ);
          return songs;
        },
        staleTime: 5 * 60 * 1000,
      };
    }),
  });

  const map = new Map<string, JioSaavnSong>();
  for (const r of results) {
    const songs = r.data ?? [];
    for (const s of songs) {
      if (!map.has(s.id)) map.set(s.id, s);
    }
  }
  const list = [...map.values()];

  const moodLoading =
    results.some((r) => r.isPending || r.isFetching) && list.length === 0;
  const moodEmpty =
    list.length === 0 &&
    !moodLoading &&
    results.every((r) => !r.isPending && !r.isFetching);
  const moodError = results.some((r) => r.isError);

  return (
    <ScreenWrapper>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
      </Pressable>
      <Text style={[styles.h, { color: meta.color }]}>{meta.label}</Text>
      <Text style={styles.ta}>{meta.labelTamil}</Text>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.brand.light}
            colors={[colors.brand.light]}
          />
        }
      >
        {moodLoading ? (
          <View>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <SongRowSkeleton key={i} />
            ))}
          </View>
        ) : moodEmpty ? (
          <Text style={styles.empty}>
            {moodError
              ? 'Could not load songs for this vibe. Pull to refresh or change the language filter on Explore.'
              : 'No songs matched this vibe yet. Try another mood or widen the language filter (Explore → Language).'}
          </Text>
        ) : (
          list.map((s, index) => (
            <SongRow
              key={s.id}
              song={s}
              onPress={() => void playQueue(list, index)}
              liked={isLiked(s.id)}
              onToggleLike={() => user && void toggleLike(s.id, isLiked(s.id))}
              showLike={!!user}
              showAddToPlaylist={!!user}
              onAddToPlaylist={() => openAddToPlaylist(s)}
            />
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing[2], alignSelf: 'flex-start' },
  h: { fontFamily: fonts.bold, fontSize: fontSize['2xl'] },
  ta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    lineHeight: 22,
    marginTop: spacing[2],
  },
});
