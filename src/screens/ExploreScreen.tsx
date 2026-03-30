import React, { useEffect, useMemo } from 'react';
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
import { useSettingsStore } from '../store/settingsStore';
import type { ExploreStackParamList } from '../navigation/types';
import {
  getExploreLanguagePillIds,
  getLanguageLabel,
  getLanguageQuerySuffix,
} from '../constants/languages';
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
  const { raw, setRaw, data, isPending } = useSearch(300);
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const langPrefs = useAuthStore((s) => s.langPrefs);
  const homeLanguageFilter = useSettingsStore((s) => s.homeLanguageFilter);
  const setHomeLanguageFilter = useSettingsStore((s) => s.setHomeLanguageFilter);
  const { isLiked, toggleLike } = useLikedSongs();

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

  const langSuffix = getLanguageQuerySuffix(homeLanguageFilter);

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper>
        <ZInput placeholder="Search songs, albums, artists" value={raw} onChangeText={setRaw} />
        {hasQuery ? (
          <ScrollView contentContainerStyle={styles.scroll}>
            {isPending ? <Text style={styles.muted}>Searching…</Text> : null}
            <Text style={styles.h}>Songs</Text>
            {songs.slice(0, 15).map((s) => (
              <SongRow
                key={s.id}
                song={s}
                onPress={() => void playQueue([s], 0)}
                liked={isLiked(s.id)}
                onToggleLike={() => user && void toggleLike(s.id, isLiked(s.id))}
                showLike={!!user}
              />
            ))}
            <Text style={styles.h}>Albums</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {albums.map((a) => (
                <AlbumCard key={a.id} album={a} onPress={() => navigation.navigate('Album', { albumId: a.id })} />
              ))}
            </ScrollView>
            <Text style={styles.h}>Artists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {artists.map((ar) => (
                <ArtistCard
                  key={ar.id}
                  artist={ar}
                  onPress={() => navigation.navigate('Artist', { artistId: ar.id })}
                />
              ))}
            </ScrollView>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.filterLabel}>Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {pillIds.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => setHomeLanguageFilter(id)}
                  style={[styles.pill, homeLanguageFilter === id && styles.pillOn]}
                >
                  <Text
                    style={[styles.pillTxt, homeLanguageFilter === id && styles.pillTxtOn]}
                  >
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
                  style={[styles.genre, { backgroundColor: g.bg }]}
                  onPress={() =>
                    navigation.navigate('SearchResults', {
                      query: g.query + langSuffix,
                      title: g.label,
                    })
                  }
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
  h: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  hRow: { gap: spacing[3], paddingBottom: spacing[2] },
  muted: { color: colors.text.secondary, fontFamily: fonts.regular },
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
  pillTxt: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.text.secondary },
  pillTxtOn: { color: colors.brand.light },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  genre: {
    width: '47%',
    minHeight: 70,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    justifyContent: 'center',
  },
  genreTxt: { fontFamily: fonts.medium, fontSize: fontSize.md },
});
