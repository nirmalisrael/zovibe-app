import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { searchSongs } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ErrorState } from '../components/ui/ErrorState';
import { SearchResultsSkeleton } from '../components/ui/PageSkeletons';
import { SongRow } from '../components/cards/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../hooks/queryKeys';
import type { ExploreStackParamList } from '../navigation/types';
import { songMatchesLanguageFilter } from '../constants/languages';
import { colors, fonts, fontSize, spacing, layout } from '../theme';

export function SearchResultsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const { query, title, language = 'all' } =
    route.params as ExploreStackParamList['SearchResults'];
  const searchQuery = query.trim();
  const { playQueue } = usePlayer();
  const user = useAuthStore((state) => state.user);
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const results = useQuery({
    queryKey: queryKeys.searchSongs(searchQuery),
    queryFn: ({ signal }) => searchSongs(searchQuery, 0, 20, signal),
    enabled: searchQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const songs = (results.data ?? []).filter((song) =>
    songMatchesLanguageFilter(song, language)
  );

  return (
    <ScreenWrapper style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? query}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {results.isPending ? (
          <SearchResultsSkeleton />
        ) : results.isError ? (
          <ErrorState
            message="Could not load songs for this search."
            onRetry={() => void results.refetch()}
          />
        ) : songs.length > 0 ? (
          songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
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
          <Text style={styles.empty}>No songs matched this search.</Text>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
    paddingHorizontal: layout.screenPadding,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 120,
  },
  empty: {
    marginTop: spacing[4],
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
});
