import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { ZInput } from '../components/ui/ZInput';
import { useSearch } from '../hooks/useSearch';
import { SongRow } from '../components/cards/SongRow';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ArtistCard } from '../components/cards/ArtistCard';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useSettingsStore } from '../store/settingsStore';
import type { ExploreStackParamList } from '../navigation/types';
import {
  getExploreLanguagePillIds,
  getLanguageLabel,
  getLanguageQuerySuffix,
} from '../constants/languages';
import { SearchResultsSkeleton } from '../components/ui/PageSkeletons';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

const GENRES: {
  label: string;
  query: string;
  bg: string;
  fg: string;
}[] = [
  { label: 'Kollywood', query: 'kollywood tamil', bg: '#1F0E20', fg: '#EC4899' },
  { label: 'Bollywood', query: 'bollywood hits', bg: '#1A1A0A', fg: '#EF9F27' },
  { label: 'Indie Tamil', query: 'indie tamil', bg: '#1A1050', fg: '#A78BFA' },
  { label: 'Devotional', query: 'devotional tamil', bg: '#0A2010', fg: '#5DCAA5' },
  { label: 'Electronic', query: 'edm hindi', bg: '#0E1F30', fg: '#06B6D4' },
  { label: 'Retro Hits', query: 'retro hits indian', bg: '#2A0A0A', fg: '#F09595' },
  { label: 'English Pop', query: 'english pop', bg: '#0A1A2A', fg: '#60A5FA' },
  { label: 'Hip-Hop', query: 'hip hop indian', bg: '#1A0A2A', fg: '#C084FC' },
];

export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const { raw, setRaw, debounced, data, isPending, isFetching } = useSearch(300);
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const langPrefs = useAuthStore((s) => s.langPrefs);
  const homeLanguageFilter = useSettingsStore((s) => s.homeLanguageFilter);
  const setHomeLanguageFilter = useSettingsStore((s) => s.setHomeLanguageFilter);
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const pillIds = useMemo(() => getExploreLanguagePillIds(langPrefs), [langPrefs]);

  useEffect(() => {
    if (!pillIds.includes(homeLanguageFilter)) {
      setHomeLanguageFilter('all');
    }
  }, [langPrefs, pillIds, homeLanguageFilter, setHomeLanguageFilter]);

  const hasQuery = raw.trim().length >= 2;
  const songs = data?.songs ?? [];
  const albums = data?.albums ?? [];
  const artists = data?.artists ?? [];
  const songResults = useMemo(() => songs.slice(0, 15), [songs]);
  const albumResults = useMemo(() => albums.slice(0, 12), [albums]);
  const artistResults = useMemo(() => artists.slice(0, 12), [artists]);
  const searchEmpty = songResults.length === 0 && albumResults.length === 0 && artistResults.length === 0;

  const langSuffix = getLanguageQuerySuffix(homeLanguageFilter);
  const searchQueryHint = debounced.length > 0 ? debounced : raw.trim();

  const onOpenAlbum = useCallback(
    (albumId: string) => {
      navigation.navigate('Album', { albumId });
    },
    [navigation]
  );

  const onOpenArtist = useCallback(
    (artistId: string) => {
      navigation.navigate('Artist', { artistId });
    },
    [navigation]
  );

  const onPressGenre = useCallback(
    (label: string, query: string) => {
      navigation.navigate('SearchResults', {
        query: `${query}${langSuffix}`.trim(),
        title: label,
      });
    },
    [navigation, langSuffix]
  );

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper>
        <ZInput
          placeholder="Search songs, albums, artists"
          value={raw}
          onChangeText={setRaw}
          accessibilityLabel="Search songs, albums, and artists"
        />
        {hasQuery ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.resultHead}>
              <Text style={styles.resultHeadTxt}>Results for "{searchQueryHint}"</Text>
              {isFetching ? <Text style={styles.resultSync}>Updating...</Text> : null}
            </View>

            {(isPending || isFetching) && searchEmpty ? (
              <SearchResultsSkeleton />
            ) : (
              <>
                {songResults.length > 0 ? (
                  <>
                    <Text style={styles.h}>Songs</Text>
                    {songResults.map((s, index) => (
                      <SongRow
                        key={s.id}
                        song={s}
                        onPress={() => {
                          void playQueue(songResults, index);
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
                  </>
                ) : null}

                {albumResults.length > 0 ? (
                  <>
                    <Text style={styles.h}>Albums</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.hRow}
                    >
                      {albumResults.map((a) => (
                        <AlbumCard key={a.id} album={a} onPress={() => onOpenAlbum(a.id)} />
                      ))}
                    </ScrollView>
                  </>
                ) : null}

                {artistResults.length > 0 ? (
                  <>
                    <Text style={styles.h}>Artists</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.hRow}
                    >
                      {artistResults.map((ar) => (
                        <ArtistCard
                          key={ar.id}
                          artist={ar}
                          onPress={() => onOpenArtist(ar.id)}
                        />
                      ))}
                    </ScrollView>
                  </>
                ) : null}

                {!isFetching && searchEmpty ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No matches yet</Text>
                    <Text style={styles.emptyBody}>Try artist name, album title, or a genre keyword.</Text>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.kicker}>Discover</Text>
            <Text style={styles.title}>Explore your vibe</Text>
            <Text style={styles.subtitle}>Pick a language and jump into curated genres.</Text>

            <Text style={styles.filterLabel}>Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {pillIds.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => setHomeLanguageFilter(id)}
                  style={({ pressed }) => [
                    styles.pill,
                    homeLanguageFilter === id && styles.pillOn,
                    pressed && styles.pillPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter Explore language: ${getLanguageLabel(id)}`}
                >
                  <Text style={[styles.pillTxt, homeLanguageFilter === id && styles.pillTxtOn]}>
                    {getLanguageLabel(id)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.h}>Genres</Text>
            <View style={styles.grid}>
              {GENRES.map((g) => (
                <Pressable
                  key={g.label}
                  style={({ pressed }) => [
                    styles.genre,
                    { backgroundColor: g.bg },
                    pressed && styles.genrePressed,
                  ]}
                  onPress={() => onPressGenre(g.label, g.query)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${g.label} results`}
                >
                  <Text style={[styles.genreTxt, { color: g.fg }]}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.brand.light,
    marginTop: spacing[1],
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize['2xl'],
    color: colors.text.primary,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  resultHead: {
    marginTop: spacing[1],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  resultHeadTxt: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  resultSync: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  h: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  hRow: { gap: spacing[3], paddingBottom: spacing[2] },
  filterLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  pills: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  pill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillOn: { borderColor: colors.brand.primary, backgroundColor: colors.bg.tertiary },
  pillPressed: { opacity: 0.8 },
  pillTxt: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.text.secondary },
  pillTxtOn: { color: colors.brand.light },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], paddingRight: layout.screenPadding * 0.1 },
  genre: {
    width: '47%',
    minHeight: 70,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  genrePressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  genreTxt: { fontFamily: fonts.medium, fontSize: fontSize.md },
  emptyCard: {
    marginTop: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  emptyBody: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary },
});
