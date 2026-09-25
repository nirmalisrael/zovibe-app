import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getArtistById, getArtistSongs, getArtistAlbums } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { ArtistDetailSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { SongRow } from '../components/cards/SongRow';
import { AlbumCard } from '../components/cards/AlbumCard';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../hooks/queryKeys';
import { colors, fonts, fontSize, spacing, layout } from '../theme';

export function ArtistScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { artistId } = route.params as { artistId: string };
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const artistQ = useQuery({
    queryKey: queryKeys.artist(artistId),
    queryFn: () => getArtistById(artistId),
  });

  const songsQ = useQuery({
    queryKey: ['artistSongs', artistId],
    queryFn: () => getArtistSongs(artistId),
    enabled: !!artistId,
  });

  const albumsQ = useQuery({
    queryKey: ['artistAlbums', artistId],
    queryFn: () => getArtistAlbums(artistId),
    enabled: !!artistId,
  });

  if (artistQ.isLoading) {
    return (
      <ScreenWrapper style={{ paddingHorizontal: 0 }}>
        <ArtistDetailSkeleton />
      </ScreenWrapper>
    );
  }

  if (artistQ.isError || !artistQ.data) {
    return (
      <ScreenWrapper>
        <ErrorState message="Artist not found" onRetry={() => void artistQ.refetch()} />
      </ScreenWrapper>
    );
  }

  const name = artistQ.data.name;
  const top =
    songsQ.data?.length ? songsQ.data : artistQ.data.topSongs ?? artistQ.data.songs ?? [];
  const topQueue = top.slice(0, 20);
  const albums = albumsQ.data?.length ? albumsQ.data : artistQ.data.albums ?? [];

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.h1}>{name}</Text>
        <Text style={styles.sec}>Top Songs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {topQueue.map((s, index) => (
            <View key={s.id} style={{ width: 280 }}>
              <SongRow
                song={s}
                onPress={() => void playQueue(topQueue, index)}
                liked={isLiked(s.id)}
                onToggleLike={() => user && void toggleLike(s.id, isLiked(s.id))}
                showLike={!!user}
                showAddToPlaylist={!!user}
                onAddToPlaylist={() => openAddToPlaylist(s)}
              />
            </View>
          ))}
        </ScrollView>
        <Text style={styles.sec}>Albums</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} onPress={() => navigation.navigate('Album', { albumId: a.id })} />
          ))}
        </ScrollView>
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing[2], alignSelf: 'flex-start' },
  h1: { fontFamily: fonts.bold, fontSize: fontSize['2xl'], color: colors.text.primary, marginBottom: spacing[4] },
  sec: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text.primary, marginBottom: spacing[2] },
  hScroll: { gap: spacing[2], paddingBottom: spacing[6], paddingRight: layout.screenPadding },
});
