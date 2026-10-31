import { useCallback, useMemo } from 'react';
import {
  FlatList,
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
import type { JioSaavnSong } from '../api/jiosaavn';
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

type HomeFeedItem =
  | { type: 'albumSection'; section: HomeAlbumSection }
  | { type: 'popularHeader' }
  | { type: 'popularEmpty' }
  | { type: 'popularSong'; song: JioSaavnSong; index: number };

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
    popularSongs,
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

  const popularQueue = !isInitialLoading && !isError ? popularSongs.slice(0, 8) : [];

  const feedItems = useMemo<HomeFeedItem[]>(() => {
    if (isInitialLoading || isError) return [];

    const items: HomeFeedItem[] = visibleSections
      .filter((section) => albumsBySection[section].length > 0)
      .map((section) => ({ type: 'albumSection', section }));

    items.push({ type: 'popularHeader' });
    popularQueue.forEach((song, index) => {
      items.push({ type: 'popularSong', song, index });
    });
    if (popularQueue.length === 0) {
      items.push({ type: 'popularEmpty' });
    }

    if (showEnglishCarousel && albumsBySection.english.length > 0) {
      items.push({ type: 'albumSection', section: 'english' });
    }

    return items;
  }, [
    albumsBySection,
    isError,
    isInitialLoading,
    showEnglishCarousel,
    popularQueue,
    visibleSections,
  ]);

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={styles.screenNoPad}>
        <FlatList
          data={feedItems}
          keyExtractor={(item) =>
            item.type === 'albumSection'
              ? `albums-${item.section}`
              : item.type === 'popularSong'
                ? `popular-${item.song.id}`
                : item.type
          }
          renderItem={({ item }) => {
            if (item.type === 'albumSection') {
              const { section } = item;
              const meta = HOME_CAROUSEL_META[section];
              return (
                <SectionCarousel
                  title={meta.carouselTitle}
                  onSeeAll={() =>
                    navigation.navigate('SearchResults', {
                      query: HOME_SEEDS[section][0],
                      title: meta.searchTitle,
                      language: section,
                    })
                  }
                >
                  {albumsBySection[section].map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      onPress={() => navigation.navigate('Album', { albumId: album.id })}
                    />
                  ))}
                </SectionCarousel>
              );
            }

            if (item.type === 'popularHeader') {
              return (
                <View style={styles.trendHead}>
                  <Text style={styles.trendTitle}>Popular picks</Text>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('SearchResults', {
                        query: HOME_SEEDS.popular[0],
                        title: 'Popular picks',
                        language: homeFilter,
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="See all popular songs"
                    hitSlop={8}
                  >
                    <Text style={styles.seeAll}>See all →</Text>
                  </Pressable>
                </View>
              );
            }

            if (item.type === 'popularEmpty') {
              return (
                <Text style={styles.emptyHint}>
                  No popular songs right now. Pull to refresh.
                </Text>
              );
            }

            const { song, index } = item;
            return (
              <SongRow
                song={song}
                onPress={() => {
                  void playQueue(popularQueue, index);
                }}
                liked={isLiked(song.id)}
                onToggleLike={() => {
                  if (!user) return;
                  toggleLike(song.id, isLiked(song.id));
                }}
                showLike={!!user}
                showAddToPlaylist={!!user}
                onAddToPlaylist={() => openAddToPlaylist(song)}
              />
            );
          }}
          ListHeaderComponent={
            <View>
              <GreetingHeader initials={initials} onAvatarPress={onAvatarPress} />
              <Text style={styles.greet}>{greetingLine()}</Text>
              <Text style={styles.sectionLabel}>Your Vibe</Text>
              <MoodPillRow onSelect={onMoodSelect} />
            </View>
          }
          ListEmptyComponent={
            isInitialLoading ? (
              <HomeFeedSkeleton />
            ) : isError ? (
              <ErrorState message="Could not load home" onRetry={onRefetch} />
            ) : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Home feed"
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefetch}
              tintColor={colors.brand.light}
              colors={[colors.brand.light]}
              progressBackgroundColor={colors.bg.secondary}
            />
          }
        />
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenNoPad: { paddingHorizontal: 0 },
  list: {
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
