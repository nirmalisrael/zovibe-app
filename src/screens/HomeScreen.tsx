import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { GreetingHeader, greetingLine } from '../components/home/GreetingHeader';
import { MoodPillRow } from '../components/home/MoodPillRow';
import { SectionCarousel } from '../components/home/SectionCarousel';
import { AlbumCard } from '../components/cards/AlbumCard';
import { SongRow } from '../components/cards/SongRow';
import { useHomeContent } from '../hooks/useHomeContent';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { HOME_SEEDS } from '../constants/homeSeed';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, layout } from '../theme';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const homeFilter = useSettingsStore((s) => s.homeLanguageFilter);
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { tamilAlbums, hindiAlbums, englishAlbums, trendingSongs, isLoading, isError, refetch } =
    useHomeContent();

  const initials =
    user?.avatar ?? (isGuest ? 'G' : '?');

  const showTamil = homeFilter === 'all' || homeFilter === 'tamil';
  const showHindi = homeFilter === 'all' || homeFilter === 'hindi';
  const showEnglish = homeFilter === 'all' || homeFilter === 'english';

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={{ paddingHorizontal: 0 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: layout.screenPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <GreetingHeader
            initials={initials}
            onAvatarPress={() => {
              const tab = navigation.getParent();
              tab?.navigate('ProfileTab', { screen: 'ProfileMain' });
            }}
          />
          <Text style={styles.greet}>{greetingLine()}</Text>

          {isLoading ? <LoadingSpinner /> : null}
          {isError ? <ErrorState message="Could not load home" onRetry={() => refetch()} /> : null}

          <Text style={styles.sectionLabel}>Your Vibe</Text>
          <MoodPillRow onSelect={(m) => navigation.navigate('Mood', { mood: m })} />

          {showTamil ? (
            <SectionCarousel
              title="Tamil Hits"
              onSeeAll={() =>
                navigation.navigate('SearchResults', {
                  query: HOME_SEEDS.tamil[0],
                  title: 'Tamil Hits',
                })
              }
            >
              {tamilAlbums.map((a) => (
                <AlbumCard key={a.id} album={a} onPress={() => navigation.navigate('Album', { albumId: a.id })} />
              ))}
            </SectionCarousel>
          ) : null}

          {showHindi ? (
            <SectionCarousel
              title="Hindi Vibes"
              onSeeAll={() =>
                navigation.navigate('SearchResults', {
                  query: HOME_SEEDS.hindi[0],
                  title: 'Hindi Vibes',
                })
              }
            >
              {hindiAlbums.map((a) => (
                <AlbumCard key={a.id} album={a} onPress={() => navigation.navigate('Album', { albumId: a.id })} />
              ))}
            </SectionCarousel>
          ) : null}

          <View style={styles.trendHead}>
            <Text style={styles.trendTitle}>Trending Now</Text>
            <Text
              style={styles.seeAll}
              onPress={() =>
                navigation.navigate('SearchResults', {
                  query: HOME_SEEDS.trending[0],
                  title: 'Trending',
                })
              }
            >
              See all →
            </Text>
          </View>
          {trendingSongs.slice(0, 8).map((s) => (
            <SongRow
              key={s.id}
              song={s}
              onPress={() => void playQueue([s], 0)}
              liked={isLiked(s.id)}
              onToggleLike={() => {
                if (!user) return;
                void toggleLike(s.id, isLiked(s.id));
              }}
              showLike={!!user}
            />
          ))}

          {showEnglish ? (
            <SectionCarousel
              title="English Picks"
              onSeeAll={() =>
                navigation.navigate('SearchResults', {
                  query: HOME_SEEDS.english[0],
                  title: 'English Picks',
                })
              }
            >
              {englishAlbums.map((a) => (
                <AlbumCard key={a.id} album={a} onPress={() => navigation.navigate('Album', { albumId: a.id })} />
              ))}
            </SectionCarousel>
          ) : null}
        </ScrollView>
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
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
});
