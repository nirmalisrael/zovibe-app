import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  searchAlbums,
  searchArtists,
  searchPlaylists,
  type JioSaavnAlbumListItem,
  type JioSaavnArtistListItem,
  type JioSaavnPlaylist,
} from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { ErrorState } from '../components/ui/ErrorState';
import { SearchResultsSkeleton } from '../components/ui/PageSkeletons';
import { ZInput } from '../components/ui/ZInput';
import { SongRow } from '../components/cards/SongRow';
import { CoverImage } from '../components/ui/CoverImage';
import { useSearch } from '../hooks/useSearch';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { queryKeys } from '../hooks/queryKeys';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { matchesLanguagePreferences } from '../constants/languages';
import {
  SEARCH_CATEGORIES,
  SEARCH_CATEGORY_LABELS,
  detectSearchCategory,
  type SearchCategory,
} from '../constants/search';
import type { ExploreStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius } from '../theme';

export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const langPrefs = useAuthStore((state) => state.langPrefs);
  const [category, setCategory] = useState<SearchCategory>('songs');
  const { raw, setRaw, debounced, songs, isPending, isFetching, isError, isSuccess, refetch } =
    useSearch('all', 350, category === 'songs');
  const trimmedQuery = raw.trim();
  const previousQuery = useRef(trimmedQuery);
  const recentSelection = useRef<{ query: string; category: SearchCategory } | null>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const albumsQuery = useQuery({
    queryKey: queryKeys.searchAlbums(debounced),
    queryFn: ({ signal }) => searchAlbums(debounced, 0, 20, signal),
    enabled: category === 'albums' && debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
  const artistsQuery = useQuery({
    queryKey: queryKeys.searchArtists(debounced),
    queryFn: ({ signal }) => searchArtists(debounced, 0, 20, signal),
    enabled: category === 'artists' && debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
  const playlistsQuery = useQuery({
    queryKey: queryKeys.searchPlaylists(debounced),
    queryFn: ({ signal }) => searchPlaylists(debounced, 0, 20, signal),
    enabled: category === 'playlists' && debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const hasQuery = trimmedQuery.length >= 2;
  const querySettled = trimmedQuery === debounced;
  const detectedCategory = detectSearchCategory(trimmedQuery);

  useEffect(() => {
    if (previousQuery.current === trimmedQuery) return;
    previousQuery.current = trimmedQuery;

    const selectedRecentSearch = recentSelection.current;
    recentSelection.current = null;
    if (selectedRecentSearch?.query.toLowerCase() === trimmedQuery.toLowerCase()) {
      setCategory(selectedRecentSearch.category);
      return;
    }

    setCategory(detectSearchCategory(trimmedQuery) ?? 'songs');
  }, [trimmedQuery]);
  const categoryQuery =
    category === 'albums' ? albumsQuery : category === 'artists' ? artistsQuery : playlistsQuery;
  const currentIsPending =
    category === 'songs' ? isPending : categoryQuery.isPending;
  const currentIsFetching =
    category === 'songs' ? isFetching : categoryQuery.isFetching;
  const currentIsError = category === 'songs' ? isError : categoryQuery.isError;
  const currentIsSuccess = category === 'songs' ? isSuccess : categoryQuery.isSuccess;

  useEffect(() => {
    if (hasQuery && querySettled && currentIsSuccess) {
      addRecentSearch(debounced, category);
    }
  }, [addRecentSearch, category, currentIsSuccess, debounced, hasQuery, querySettled]);

  const onSelectRecentSearch = (query: string, recentCategory: SearchCategory) => {
    recentSelection.current = { query, category: recentCategory };
    setCategory(recentCategory);
    setRaw(query);
    Keyboard.dismiss();
  };

  const filteredSongs = useMemo(
    () => songs.filter((song) => matchesLanguagePreferences(song.language, langPrefs)),
    [langPrefs, songs]
  );
  const filteredAlbums = useMemo(
    () =>
      (albumsQuery.data ?? []).filter((album) =>
        matchesLanguagePreferences(album.language, langPrefs)
      ),
    [albumsQuery.data, langPrefs]
  );
  const filteredPlaylists = useMemo(
    () =>
      (playlistsQuery.data ?? []).filter((playlist) =>
        matchesLanguagePreferences(playlist.language, langPrefs)
      ),
    [langPrefs, playlistsQuery.data]
  );

  const renderCatalogRow = (
    title: string,
    subtitle: string,
    image: string | undefined,
    onPress: () => void,
    roundImage = false
  ) => (
    <Pressable
      style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      <View style={roundImage ? styles.artistImage : undefined}>
        <CoverImage uri={image} size={56} radius={roundImage ? 28 : borderRadius.sm} />
      </View>
      <View style={styles.resultText}>
        <Text style={styles.resultName} numberOfLines={1}>{title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
    </Pressable>
  );

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper>
        <Text style={styles.kicker}>EXPLORE</Text>
        <Text style={styles.title}>Find your music</Text>
        <ZInput
          placeholder="Search music"
          value={raw}
          onChangeText={(value) => {
            recentSelection.current = null;
            setRaw(value);
          }}
          onSubmitEditing={() => Keyboard.dismiss()}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search music"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryOptions}
          keyboardShouldPersistTaps="handled"
          style={styles.categoryScroll}
        >
          {SEARCH_CATEGORIES.map((option) => (
            <Pressable
              key={option}
              onPress={() => setCategory(option)}
              style={({ pressed }) => [
                styles.categoryOption,
                category === option && styles.categoryOptionSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: category === option }}
              accessibilityLabel={`Search ${SEARCH_CATEGORY_LABELS[option]}`}
            >
              <Text style={[
                styles.categoryOptionText,
                category === option && styles.categoryOptionTextSelected,
              ]}>
                {SEARCH_CATEGORY_LABELS[option]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {!hasQuery ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.searchTip}>
              Use Playlists for searches like “trending songs” to find matching collections.
            </Text>
            {recentSearches.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent searches</Text>
                  <Pressable
                    onPress={clearRecentSearches}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Clear recent searches"
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                </View>
                {recentSearches.map((recent) => (
                  <Pressable
                    key={`${recent.category}:${recent.query.toLowerCase()}`}
                    onPress={() => onSelectRecentSearch(recent.query, recent.category)}
                    style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${SEARCH_CATEGORY_LABELS[recent.category]} for ${recent.query}`}
                  >
                    <Ionicons name="time-outline" size={19} color={colors.text.tertiary} />
                    <Text style={styles.recentQuery} numberOfLines={1}>
                      {recent.query}
                    </Text>
                    <Text style={styles.recentLanguage}>{SEARCH_CATEGORY_LABELS[recent.category]}</Text>
                    <Ionicons name="arrow-up-outline" size={17} color={colors.text.tertiary} />
                  </Pressable>
                ))}
              </>
            ) : (
              <Text style={styles.emptyHint}>Search for music, then choose a category.</Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.resultsTitle}>
              {SEARCH_CATEGORY_LABELS[category]} for “{trimmedQuery}”
            </Text>
            {detectedCategory && detectedCategory === category ? (
              <Text style={styles.intentHint}>
                Showing {SEARCH_CATEGORY_LABELS[category].toLowerCase()} based on your search.
                {' '}You can switch categories anytime.
              </Text>
            ) : null}
            {!querySettled || currentIsPending || currentIsFetching ? (
              <SearchResultsSkeleton />
            ) : currentIsError ? (
              <ErrorState
                message={`Could not load ${SEARCH_CATEGORY_LABELS[category].toLowerCase()}.`}
                onRetry={() => {
                  if (category === 'songs') void refetch();
                  else void categoryQuery.refetch();
                }}
              />
            ) : category === 'songs' && filteredSongs.length > 0 ? (
              filteredSongs.map((song, index) => (
                <SongRow
                  key={song.id}
                  song={song}
                  onPress={() => void playQueue(filteredSongs, index)}
                  liked={isLiked(song.id)}
                  onToggleLike={() => {
                    if (user) void toggleLike(song.id, isLiked(song.id));
                  }}
                  showLike={!!user}
                  showAddToPlaylist={!!user}
                  onAddToPlaylist={() => openAddToPlaylist(song)}
                />
              ))
            ) : category === 'albums' && filteredAlbums.length > 0 ? (
              filteredAlbums.map((album: JioSaavnAlbumListItem) =>
                renderCatalogRow(
                  album.name,
                  [album.artists?.primary?.[0]?.name, album.year].filter(Boolean).join(' · ') || 'Album',
                  album.image?.at(-1)?.url,
                  () => navigation.navigate('Album', { albumId: album.id })
                )
              )
            ) : category === 'artists' && (artistsQuery.data?.length ?? 0) > 0 ? (
              artistsQuery.data?.map((artist: JioSaavnArtistListItem) =>
                renderCatalogRow(
                  artist.name,
                  'Artist',
                  artist.image?.at(-1)?.url,
                  () => navigation.navigate('Artist', { artistId: artist.id }),
                  true
                )
              )
            ) : category === 'playlists' && filteredPlaylists.length > 0 ? (
              filteredPlaylists.map((playlist: JioSaavnPlaylist) =>
                renderCatalogRow(
                  playlist.name,
                  playlist.songCount != null ? `${playlist.songCount} songs · Playlist` : 'Playlist',
                  playlist.image?.at(-1)?.url,
                  () => navigation.navigate('SearchPlaylist', { playlistId: playlist.id })
                )
              )
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No {SEARCH_CATEGORY_LABELS[category].toLowerCase()} found</Text>
                <Text style={styles.emptyHint}>
                  Try another spelling or switch to a different category.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
    letterSpacing: 1,
    marginBottom: spacing[1],
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize['2xl'],
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  categoryScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing[2],
  },
  categoryOptions: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  categoryOption: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  categoryOptionSelected: {
    backgroundColor: colors.bg.tertiary,
    borderColor: colors.brand.primary,
  },
  categoryOptionText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  categoryOptionTextSelected: {
    color: colors.brand.light,
  },
  resultRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  artistImage: {
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  resultText: {
    flex: 1,
    gap: spacing[1],
  },
  resultName: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  resultSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  searchTip: {
    marginTop: spacing[1],
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
  },
  clearText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.brand.light,
  },
  recentRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  recentQuery: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  recentLanguage: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  resultsTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  intentHint: {
    marginBottom: spacing[2],
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.brand.light,
  },
  emptyCard: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  emptyHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: colors.text.tertiary,
    paddingVertical: spacing[3],
  },
  pressed: {
    opacity: 0.75,
  },
});
