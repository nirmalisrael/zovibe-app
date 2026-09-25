import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { searchSongs } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { HomeFeedSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { GreetingHeader, greetingLine } from '../components/home/GreetingHeader';
import { MoodPillRow } from '../components/home/MoodPillRow';
import { SectionCarousel } from '../components/home/SectionCarousel';
import { AlbumCard } from '../components/cards/AlbumCard';
import { SongRow } from '../components/cards/SongRow';
import { formatTime } from '../utils/formatTime';
import { cleanHtmlEntities, getPrimaryArtistNames } from '../utils/songHelpers';
import { useHomeContent } from '../hooks/useHomeContent';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  HOME_ALBUM_SECTIONS,
  HOME_SEEDS,
  HOME_CAROUSEL_META,
  type HomeAlbumSection,
} from '../constants/homeSeed';
import {
  getHomeAlbumSectionsFromLangPrefs,
  type LanguageFilterId,
} from '../constants/languages';
import type { MoodType } from '../constants/moods';
import { resolveUserAvatar } from '../entities';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, layout, borderRadius } from '../theme';

const QUICK_SEARCH_CHIPS = ['Trending Hits', 'Top Songs', 'Acoustic', 'Melody', 'Party Beats'] as const;

function showHomeLanguageSection(section: HomeAlbumSection, filter: LanguageFilterId) {
  if (filter === 'all' || filter === section) return true;
  if (filter === 'indian' && section !== 'english') return true;
  return false;
}

/** Carousels for Indian languages + English, in order; English is shown after Trending below. */
const HOME_SECTIONS_BEFORE_TRENDING = HOME_ALBUM_SECTIONS.filter((s) => s !== 'english');

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const langPrefs = useAuthStore((s) => s.langPrefs);
  const homeFilter = useSettingsStore((s) => s.homeLanguageFilter);
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const langPrefsKey = langPrefs.join('|');
  const prefAlbumSections = useMemo(
    () => getHomeAlbumSectionsFromLangPrefs(langPrefs),
    [langPrefsKey]
  );
  const albumSectionsForFeed = prefAlbumSections ?? HOME_ALBUM_SECTIONS;

  const {
    albumsBySection,
    trendingSongs,
    isInitialLoading,
    isFetching,
    isError,
    refetch,
  } = useHomeContent(albumSectionsForFeed, langPrefs);

  const initials = useMemo(() => {
    if (user) return resolveUserAvatar(user);
    if (isGuest) return 'G';
    return '?';
  }, [user, isGuest]);

  const onAvatarPress = useCallback(() => {
    const tab = navigation.getParent();
    tab?.navigate('ProfileTab', { screen: 'ProfileMain' });
  }, [navigation]);

  const onMoodSelect = useCallback(
    (m: MoodType) => {
      navigation.navigate('Mood', { mood: m });
    },
    [navigation]
  );

  const onRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const visibleSections = useMemo(
    () =>
      HOME_SECTIONS_BEFORE_TRENDING.filter((s) => {
        if (prefAlbumSections !== null && !prefAlbumSections.includes(s)) return false;
        return showHomeLanguageSection(s, homeFilter);
      }),
    [prefAlbumSections, homeFilter]
  );

  const showEnglishCarousel =
    (prefAlbumSections === null || prefAlbumSections.includes('english')) &&
    showHomeLanguageSection('english', homeFilter);

  const refreshing = isFetching && !isInitialLoading;

  const trendingQueue = !isInitialLoading && !isError ? trendingSongs.slice(0, 8) : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasSearchText = searchQuery.trim().length >= 2;

  const { data: suggestions = [], isFetching: isSearchingSuggestions } = useQuery({
    queryKey: ['home', 'songSuggestions', debouncedSearch],
    queryFn: () => searchSongs(debouncedSearch, 0, 6),
    enabled: debouncedSearch.length >= 2,
    staleTime: 60 * 1000,
  });

  const onSearchSubmit = useCallback(
    (overrideQuery?: string) => {
      const q = (overrideQuery ?? searchQuery).trim();
      if (q.length > 0) {
        navigation.navigate('SearchResults', {
          query: q,
          title: q,
        });
      }
    },
    [navigation, searchQuery]
  );

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={styles.screenNoPad}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Home feed"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefetch}
              tintColor={colors.brand.light}
              colors={[colors.brand.light]}
              progressBackgroundColor={colors.bg.secondary}
            />
          }
        >
          <GreetingHeader
            initials={initials}
            onAvatarPress={onAvatarPress}
            onSearchPress={() => searchInputRef.current?.focus()}
          />
          <Text style={styles.greet}>{greetingLine()}</Text>

          {/* Search Bar for Songs */}
          <View
            style={[
              styles.searchBar,
              isSearchFocused && styles.searchBarFocused,
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={isSearchFocused ? colors.brand.primary : colors.text.tertiary}
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search songs, artists, albums..."
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="search"
              onSubmitEditing={() => onSearchSubmit()}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={styles.searchInput}
              accessibilityLabel="Search songs"
            />
            {searchQuery.length > 0 ? (
              <View style={styles.searchActions}>
                <Pressable
                  onPress={() => setSearchQuery('')}
                  style={styles.searchClearBtn}
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={17} color={colors.text.muted} />
                </Pressable>
                <Pressable
                  onPress={() => onSearchSubmit()}
                  style={styles.searchSubmitBtn}
                  accessibilityLabel="Submit search"
                  hitSlop={8}
                >
                  <Ionicons name="arrow-forward" size={14} color={colors.text.inverse} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Live Search Suggestions (YouTube / Google Search Style) */}
          {hasSearchText ? (
            <View style={styles.suggestionsContainer}>
              {isSearchingSuggestions && suggestions.length === 0 ? (
                <View style={styles.suggestionLoadingRow}>
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                  <Text style={styles.suggestionLoadingText}>Finding matching songs...</Text>
                </View>
              ) : suggestions.length > 0 ? (
                suggestions.map((song) => {
                  const songName = cleanHtmlEntities(song.name);
                  const artist = getPrimaryArtistNames(song);
                  const dur = formatTime(song.duration);
                  return (
                    <Pressable
                      key={song.id}
                      onPress={() => onSearchSubmit(songName)}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && styles.suggestionRowPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Search for ${songName}`}
                    >
                      <View style={styles.suggestionIconWrap}>
                        <Ionicons name="musical-notes-outline" size={15} color={colors.brand.light} />
                      </View>
                      <View style={styles.suggestionTextWrap}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>
                          {songName}
                        </Text>
                        <Text style={styles.suggestionArtist} numberOfLines={1}>
                          {artist}{dur ? ` • ${dur}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setSearchQuery(songName)}
                        hitSlop={10}
                        style={styles.suggestionInsertBtn}
                        accessibilityLabel={`Insert ${songName} into search`}
                      >
                        <Ionicons
                          name="arrow-back-outline"
                          size={15}
                          color={colors.text.tertiary}
                          style={{ transform: [{ rotate: '45deg' }] }}
                        />
                      </Pressable>
                    </Pressable>
                  );
                })
              ) : !isSearchingSuggestions ? (
                <View style={styles.suggestionEmptyRow}>
                  <Text style={styles.suggestionEmptyText}>No matching songs found</Text>
                </View>
              ) : null}

              {/* View all search results option */}
              <Pressable
                onPress={() => onSearchSubmit(searchQuery)}
                style={({ pressed }) => [
                  styles.suggestionSeeAllRow,
                  pressed && styles.suggestionRowPressed,
                ]}
              >
                <Ionicons name="search-outline" size={14} color={colors.brand.light} style={{ marginRight: 8 }} />
                <Text style={styles.suggestionSeeAllText} numberOfLines={1}>
                  See all results for "{searchQuery.trim()}"
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Quick Search Chips */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsContainer}
              style={styles.quickChipsWrapper}
            >
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => {
                    setSearchQuery(chip);
                    onSearchSubmit(chip);
                  }}
                  style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${chip}`}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={12}
                    color={colors.brand.light}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.quickChipText}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Text style={styles.sectionLabel}>Your Vibe</Text>
          <MoodPillRow onSelect={onMoodSelect} />

          {isInitialLoading ? <HomeFeedSkeleton /> : null}
          {!isInitialLoading && isError ? (
            <ErrorState message="Could not load home" onRetry={onRefetch} />
          ) : null}

          {!isInitialLoading &&
            !isError &&
            visibleSections.map((section) => {
              const meta = HOME_CAROUSEL_META[section];
              const albums = albumsBySection[section];
              if (!albums.length) return null;
              return (
                <SectionCarousel
                  key={section}
                  title={meta.carouselTitle}
                  onSeeAll={() =>
                    navigation.navigate('SearchResults', {
                      query: HOME_SEEDS[section][0],
                      title: meta.searchTitle,
                    })
                  }
                >
                  {albums.map((a) => (
                    <AlbumCard
                      key={a.id}
                      album={a}
                      onPress={() => navigation.navigate('Album', { albumId: a.id })}
                    />
                  ))}
                </SectionCarousel>
              );
            })}

          {!isInitialLoading && !isError ? (
            <>
              <View style={styles.trendHead}>
                <Text style={styles.trendTitle}>Trending Now</Text>
                <Pressable
                  onPress={() =>
                    navigation.navigate('SearchResults', {
                      query: HOME_SEEDS.trending[0],
                      title: 'Trending',
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="See all trending tracks"
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>See all →</Text>
                </Pressable>
              </View>
              {trendingQueue.length > 0 ? (
                trendingQueue.map((s, index) => (
                  <SongRow
                    key={s.id}
                    song={s}
                    onPress={() => {
                      void playQueue(trendingQueue, index);
                    }}
                    liked={isLiked(s.id)}
                    onToggleLike={() => {
                      if (!user) return;
                      toggleLike(s.id, isLiked(s.id));
                    }}
                    showLike={!!user}
                    showAddToPlaylist={!!user}
                    onAddToPlaylist={() => openAddToPlaylist(s)}
                  />
                ))
              ) : (
                <Text style={styles.emptyHint}>No trending tracks right now. Pull to refresh.</Text>
              )}
            </>
          ) : null}

          {!isInitialLoading &&
            !isError &&
            showEnglishCarousel &&
            albumsBySection.english.length > 0 ? (
            <SectionCarousel
              title={HOME_CAROUSEL_META.english.carouselTitle}
              onSeeAll={() =>
                navigation.navigate('SearchResults', {
                  query: HOME_SEEDS.english[0],
                  title: HOME_CAROUSEL_META.english.searchTitle,
                })
              }
            >
              {albumsBySection.english.map((a) => (
                <AlbumCard
                  key={a.id}
                  album={a}
                  onPress={() => navigation.navigate('Album', { albumId: a.id })}
                />
              ))}
            </SectionCarousel>
          ) : null}
        </ScrollView>
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenNoPad: { paddingHorizontal: 0 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 120,
  },
  trendHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  trendTitle: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text.primary },
  seeAll: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.brand.light },
  greet: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 46,
    marginBottom: spacing[2],
  },
  searchBarFocused: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.bg.tertiary,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchClearBtn: {
    padding: 2,
  },
  searchSubmitBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipsWrapper: {
    marginBottom: spacing[4],
  },
  quickChipsContainer: {
    gap: spacing[2],
    paddingVertical: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  quickChipPressed: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.bg.tertiary,
  },
  quickChipText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  suggestionsContainer: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  suggestionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  suggestionLoadingText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  suggestionRowPressed: {
    backgroundColor: colors.bg.tertiary,
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  suggestionTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  suggestionTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  suggestionArtist: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  suggestionInsertBtn: {
    padding: spacing[1],
    marginLeft: spacing[2],
  },
  suggestionEmptyRow: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionEmptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  suggestionSeeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.bg.tertiary,
  },
  suggestionSeeAllText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
  },
});
