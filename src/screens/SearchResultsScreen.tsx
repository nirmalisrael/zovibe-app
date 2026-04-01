import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { searchAll } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { SearchResultsSkeleton } from '../components/ui/PageSkeletons';
import { SongRow } from '../components/cards/SongRow';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ArtistCard } from '../components/cards/ArtistCard';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../hooks/queryKeys';
import { colors, fonts, fontSize, spacing, layout } from '../theme';

export function SearchResultsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { query, title } = route.params as { query: string; title?: string };
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const q = useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchAll(query),
    enabled: query.length > 0,
  });

  const songs = q.data?.songs ?? [];
  const albums = q.data?.albums ?? [];
  const artists = q.data?.artists ?? [];

  return (
    <ScreenWrapper style={{ paddingHorizontal: 0 }}>
      <View style={[styles.head, { paddingHorizontal: layout.screenPadding }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{title ?? query}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingBottom: 120 }}>
        {q.isLoading ? (
          <SearchResultsSkeleton />
        ) : (
          <>
            <Text style={styles.sec}>Songs</Text>
            {songs.map((s, index) => (
              <SongRow
                key={s.id}
                song={s}
                onPress={() => void playQueue(songs, index)}
                liked={isLiked(s.id)}
                onToggleLike={() => user && void toggleLike(s.id, isLiked(s.id))}
                showLike={!!user}
                showAddToPlaylist={!!user}
                onAddToPlaylist={() => openAddToPlaylist(s)}
              />
            ))}
            <Text style={styles.sec}>Albums</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.h}>
              {albums.map((a) => (
                <AlbumCard key={a.id} album={a} onPress={() => navigation.navigate('Album', { albumId: a.id })} />
              ))}
            </ScrollView>
            <Text style={styles.sec}>Artists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.h}>
              {artists.map((ar) => (
                <ArtistCard
                  key={ar.id}
                  artist={ar}
                  onPress={() => navigation.navigate('Artist', { artistId: ar.id })}
                />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: spacing[4] },
  title: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text.primary, marginTop: spacing[2] },
  sec: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text.primary, marginTop: spacing[4] },
  h: { gap: spacing[3], flexDirection: 'row' },
});
