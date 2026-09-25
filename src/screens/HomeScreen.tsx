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
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { searchSongs } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { HomeFeedSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { GreetingHeader, greetingLine } from '../components/home/GreetingHeader';
import { SleepTimerModal } from '../components/player/SleepTimerModal';
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
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
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
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.16)', 'rgba(124, 58, 237, 0.04)', 'transparent']}
          style={styles.ambientGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />
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
            onSleepTimerPress={() => setSleepTimerVisible(true)}
          />

          <View style={styles.greetContainer}>
            <View style={styles.greetPill}>
              <Ionicons name="sparkles" size={12} color={colors.brand.light} />
              <Text style={styles.greetText} numberOfLines={1}>
                {greetingLine()}
              </Text>
            </View>
          </View>

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

          <View style={styles.sectionHeadingWrap}>
            <View style={styles.sectionHeadingLeft}>
              <View style={styles.sectionHeadingBar} />
              <Text style={styles.sectionHeadingTitle}>Your Vibe</Text>
            </View>
            <Text style={styles.sectionHeadingHint}>Curated for you</Text>
          </View>
          <MoodPillRow onSelect={onMoodSelect} />

          {isInitialLoading ? <HomeFeedSkeleton /> : null}
          {!isInitialLoading && isError ? (
            <ErrorState message="Could not load home" onRetry={onRefetch} />
          ) : null}

          {!isInitialLoading &&
            !isError &&
            visibleSections.map((section) => {
              const meta = HOME_CAROUSEL_META[section];
              const albums = albumsBySection?.[section] ?? [];
              if (!meta || albums.length === 0) return null;
              return (
                <SectionCarousel
                  key={section}
                  title={meta.carouselTitle}
                  onSeeAll={() =>
                    navigation.navigate('SearchResults', {
                      query: HOME_SEEDS[section]?.[0] ?? section,
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
            <View style={styles.trendingCard}>
              <View style={styles.trendHead}>
                <View style={styles.trendTitleGroup}>
                  <View style={styles.trendBadgeIcon}>
                    <Ionicons name="flame" size={15} color="#f43f5e" />
                  </View>
                  <View>
                    <Text style={styles.trendTitle}>Trending Now</Text>
                    <Text style={styles.trendSub}>Most streamed tracks today</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    navigation.navigate('SearchResults', {
                      query: HOME_SEEDS.trending[0],
                      title: 'Trending',
                    })
                  }
                  style={({ pressed }) => [styles.seeAllPill, pressed && styles.seeAllPillPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="See all trending tracks"
                  hitSlop={8}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.brand.light} style={{ marginLeft: 2 }} />
                </Pressable>
              </View>
              {trendingQueue.length > 0 ? (
                <View style={styles.trendingListWrap}>
                  {trendingQueue.map((s, index) => (
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
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyHint}>No trending tracks right now. Pull to refresh.</Text>
              )}
            </View>
          ) : null}

          {!isInitialLoading &&
            !isError &&
            showEnglishCarousel &&
            (albumsBySection?.english?.length ?? 0) > 0 ? (
            <SectionCarousel
              title={HOME_CAROUSEL_META.english.carouselTitle}
              onSeeAll={() =>
                navigation.navigate('SearchResults', {
                  query: HOME_SEEDS.english?.[0] ?? 'english',
                  title: HOME_CAROUSEL_META.english.searchTitle,
                })
              }
            >
              {(albumsBySection?.english ?? []).map((a) => (
                <AlbumCard
                  key={a.id}
                  album={a}
                  onPress={() => navigation.navigate('Album', { albumId: a.id })}
                />
              ))}
            </SectionCarousel>
          ) : null}
        </ScrollView>

        <SleepTimerModal
          visible={sleepTimerVisible}
          onClose={() => setSleepTimerVisible(false)}
        />
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenNoPad: { paddingHorizontal: 0 },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 120,
  },
  greetContainer: {
    marginBottom: spacing[3],
    paddingHorizontal: 2,
  },
  greetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    gap: 6,
  },
  greetText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
    letterSpacing: 0.2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[3] + 2,
    height: 48,
    marginBottom: spacing[3],
  },
  searchBarFocused: {
    borderColor: colors.brand.primary,
    backgroundColor: 'rgba(28, 28, 35, 0.98)',
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    backgroundColor: 'rgba(28, 28, 35, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: spacing[3] + 2,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  quickChipPressed: {
    borderColor: colors.brand.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
  },
  quickChipText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(24, 24, 30, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    borderRadius: borderRadius.lg,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionRowPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
  },
  suggestionSeeAllText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  sectionHeadingWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    marginTop: spacing[1],
    paddingHorizontal: 2,
  },
  sectionHeadingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionHeadingBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
  },
  sectionHeadingTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  sectionHeadingHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  trendingCard: {
    marginBottom: layout.sectionGap + spacing[1],
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(24, 24, 30, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing[3] + 2,
    overflow: 'hidden',
  },
  trendHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  trendTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  trendBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md + 1,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  trendSub: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  seeAllPillPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
  },
  seeAllText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  trendingListWrap: {
    marginTop: spacing[1],
  },
  emptyHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
    paddingVertical: spacing[2],
    textAlign: 'center',
  },
});
