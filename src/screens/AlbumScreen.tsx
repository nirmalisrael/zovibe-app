import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getAlbumById } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { CoverImage } from '../components/ui/CoverImage';
import { LanguageBadge } from '../components/ui/LanguageBadge';
import { SongRow } from '../components/cards/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../hooks/queryKeys';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

export function AlbumScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { albumId } = route.params as { albumId: string };
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const { isLiked, toggleLike } = useLikedSongs();

  const q = useQuery({
    queryKey: queryKeys.album(albumId),
    queryFn: () => getAlbumById(albumId),
  });

  if (q.isLoading) {
    return (
      <ScreenWrapper>
        <LoadingSpinner />
      </ScreenWrapper>
    );
  }

  if (q.isError || !q.data) {
    return (
      <ScreenWrapper>
        <ErrorState message="Album not found" onRetry={() => void q.refetch()} />
      </ScreenWrapper>
    );
  }

  const album = q.data;
  const songs = album.songs ?? [];
  const img = album.image?.[album.image.length - 1]?.url;
  const primary = album.artists?.primary?.[0];

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={{ paddingHorizontal: 0 }}>
        <View style={[styles.head, { paddingHorizontal: layout.screenPadding }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </Pressable>
        </View>
        <View style={[styles.hero, { paddingHorizontal: layout.screenPadding }]}>
          <CoverImage uri={img} size={180} radius={borderRadius.xl} />
          <Text style={styles.title}>{album.name}</Text>
          {primary ? (
            <Pressable onPress={() => navigation.navigate('Artist', { artistId: primary.id })}>
              <Text style={styles.sub}>{primary.name}</Text>
            </Pressable>
          ) : null}
          <View style={styles.meta}>
            {album.year ? <Text style={styles.muted}>{album.year}</Text> : null}
            {album.language ? <LanguageBadge language={album.language} /> : null}
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.actBtn} onPress={() => songs.length && void playQueue(songs, 0)}>
              <Text style={styles.actTxt}>Play all</Text>
            </Pressable>
            <Pressable
              style={styles.actBtnGhost}
              onPress={() => {
                if (songs.length < 2) return;
                const shuffled = [...songs].sort(() => Math.random() - 0.5);
                void playQueue(shuffled, 0);
              }}
            >
              <Text style={styles.actTxtGhost}>Shuffle</Text>
            </Pressable>
          </View>
        </View>
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingBottom: 120 }}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              index={index + 1}
              onPress={() => void playQueue(songs, index)}
              liked={isLiked(item.id)}
              onToggleLike={() => user && void toggleLike(item.id, isLiked(item.id))}
              showLike={!!user}
            />
          )}
        />
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: spacing[2] },
  hero: { marginBottom: spacing[4] },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.brand.light, marginTop: spacing[1] },
  meta: { flexDirection: 'row', gap: spacing[3], alignItems: 'center', marginTop: spacing[2] },
  muted: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  actBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  actTxt: { fontFamily: fonts.medium, color: colors.text.inverse },
  actBtnGhost: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  actTxtGhost: { fontFamily: fonts.medium, color: colors.brand.light },
});
