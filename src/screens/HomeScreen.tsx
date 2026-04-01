import { useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { HomeFeedSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { GreetingHeader, greetingLine } from '../components/home/GreetingHeader';
import { MoodPillRow } from '../components/home/MoodPillRow';
import { SectionCarousel } from '../components/home/SectionCarousel';
import { AlbumCard } from '../components/cards/AlbumCard';
import { SongRow } from '../components/cards/SongRow';
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
import { colors, fonts, fontSize, spacing, layout } from '../theme';

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
          <GreetingHeader initials={initials} onAvatarPress={onAvatarPress} />
          <Text style={styles.greet}>{greetingLine()}</Text>

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
    marginBottom: spacing[4],
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
