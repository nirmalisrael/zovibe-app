import { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, type ListRenderItemInfo } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getAlbumById } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { AlbumDetailSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { CoverImage } from '../components/ui/CoverImage';
import { LanguageBadge } from '../components/ui/LanguageBadge';
import { SongRow } from '../components/cards/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
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
  const { openAddToPlaylist } = useAddToPlaylist();

  const q = useQuery({
    queryKey: queryKeys.album(albumId),
    queryFn: () => getAlbumById(albumId),
  });

  const album = q.data ?? null;
  const songs = album?.songs ?? [];
  const imgList = album?.image ?? [];
  const img = imgList.at(-1)?.url;
  const primary = album?.artists?.primary?.[0];
  const songCount = songs.length;
  const subtitle = primary?.name ?? 'Unknown artist';
  const canShuffle = songs.length >= 2;

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onOpenPrimaryArtist = useCallback(() => {
    if (!primary?.id) return;
    navigation.navigate('Artist', { artistId: primary.id });
  }, [navigation, primary?.id]);

  const onPlayAll = useCallback(() => {
    if (!songs.length) return;
    playQueue(songs, 0);
  }, [playQueue, songs]);

  const onShuffle = useCallback(() => {
    if (songs.length < 2) return;
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playQueue(shuffled, 0);
  }, [playQueue, songs]);

  const header = useMemo(
    () => (
      <View style={styles.heroWrap}>
        <View style={styles.head}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <CoverImage uri={img} size={178} radius={borderRadius.xl} />
          <Text style={styles.title}>{album?.name ?? 'Album'}</Text>
          <Pressable
            onPress={onOpenPrimaryArtist}
            disabled={!primary?.id}
            style={({ pressed }) => [pressed && primary?.id ? styles.artistPressed : null]}
            accessibilityRole={primary?.id ? 'button' : undefined}
            accessibilityLabel={primary?.id ? `Open artist ${subtitle}` : undefined}
          >
            <Text style={styles.sub}>{subtitle}</Text>
          </Pressable>

          <View style={styles.meta}>
            {album?.year ? <Text style={styles.muted}>{album.year}</Text> : null}
            <Text style={styles.muted}>{songCount} song{songCount === 1 ? '' : 's'}</Text>
            {album?.language ? <LanguageBadge language={album.language} /> : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.actBtn, pressed && styles.primaryPressed]}
              onPress={onPlayAll}
              accessibilityRole="button"
              accessibilityLabel="Play all songs"
            >
              <Text style={styles.actTxt}>Play all</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actBtnGhost,
                !canShuffle && styles.disabledBtn,
                pressed && canShuffle && styles.ghostPressed,
              ]}
              onPress={onShuffle}
              disabled={!canShuffle}
              accessibilityRole="button"
              accessibilityLabel="Shuffle songs"
            >
              <Text style={[styles.actTxtGhost, !canShuffle && styles.disabledTxt]}>Shuffle</Text>
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [
      onBack,
      img,
      album?.name,
      onOpenPrimaryArtist,
      primary?.id,
      subtitle,
      album?.year,
      songCount,
      album?.language,
      onPlayAll,
      canShuffle,
      onShuffle,
    ]
  );

  const renderSong = useCallback(
    ({ item, index }: ListRenderItemInfo<(typeof songs)[number]>) => (
      <SongRow
        song={item}
        index={index + 1}
        onPress={() => {
          playQueue(songs, index);
        }}
        liked={isLiked(item.id)}
        onToggleLike={() => {
          if (!user) return;
          toggleLike(item.id, isLiked(item.id));
        }}
        showLike={!!user}
        showAddToPlaylist={!!user}
        onAddToPlaylist={() => openAddToPlaylist(item)}
      />
    ),
    [playQueue, songs, isLiked, user, toggleLike, openAddToPlaylist]
  );

  if (q.isLoading) {
    return (
      <ScreenErrorBoundary>
        <ScreenWrapper style={styles.screenNoPad}>
          <AlbumDetailSkeleton />
        </ScreenWrapper>
      </ScreenErrorBoundary>
    );
  }

  if (q.isError || !q.data) {
    return (
      <ScreenErrorBoundary>
        <ScreenWrapper>
          <ErrorState message="Album not found" onRetry={() => void q.refetch()} />
        </ScreenWrapper>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={styles.screenNoPad}>
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          renderItem={renderSong}
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={12}
          windowSize={8}
          updateCellsBatchingPeriod={40}
          showsVerticalScrollIndicator={false}
        />
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenNoPad: { paddingHorizontal: 0 },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: 120 },
  heroWrap: { marginBottom: spacing[2] },
  head: { marginBottom: spacing[2], marginTop: spacing[1] },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: { opacity: 0.85 },
  hero: { marginBottom: spacing[4] },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  sub: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.brand.light, marginTop: spacing[1] },
  artistPressed: { opacity: 0.85 },
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
  primaryPressed: { opacity: 0.88 },
  actBtnGhost: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  actTxtGhost: { fontFamily: fonts.medium, color: colors.brand.light },
  ghostPressed: { opacity: 0.86 },
  disabledBtn: { borderColor: colors.border.default, opacity: 0.55 },
  disabledTxt: { color: colors.text.secondary },
});
