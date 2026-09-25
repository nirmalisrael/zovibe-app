import { useState, useCallback, useMemo, useEffect, useRef, type ComponentProps } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ScreenErrorBoundary } from '../components/ui/ScreenErrorBoundary';
import { LibraryPlaylistSkeleton, SongRowSkeleton } from '../components/ui/PageSkeletons';
import { ErrorState } from '../components/ui/ErrorState';
import { PlaylistCard } from '../components/cards/PlaylistCard';
import { SongRow } from '../components/cards/SongRow';
import {
  getUserPlaylists,
  createPlaylist,
  parseJsonArray,
  type MockAPIPlaylistRow,
} from '../api/mockapi';
import { getSongById } from '../api/jiosaavn';
import type { JioSaavnSong } from '../api/jiosaavn';
import { useAuthStore } from '../store/authStore';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { queryKeys } from '../hooks/queryKeys';
import type { LibraryStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'playlists' | 'liked' | 'history';

const TABS: ReadonlyArray<{
  id: Tab;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  activeIcon: ComponentProps<typeof Ionicons>['name'];
}> = [
  { id: 'playlists', label: 'Playlists', icon: 'albums-outline', activeIcon: 'albums' },
  { id: 'liked', label: 'Liked', icon: 'heart-outline', activeIcon: 'heart' },
  { id: 'history', label: 'History', icon: 'time-outline', activeIcon: 'time' },
];

const TAB_COUNT = TABS.length;
const SEG_OUTER_PAD = 3;
const SEG_GAP = 3;
/** ms per px — short hops (e.g. Liked ↔ History) stay visibly smooth; long jumps scale up in time. */
const SEG_PILL_MS_PER_PX = 0.72;
const SEG_PILL_DURATION_MIN = 200;
const SEG_PILL_DURATION_MAX = 400;
const segPillEasing = Easing.out(Easing.cubic);
const SEG_LAYOUT_WIDTH_EPS = 1;

// ─── EmptyBlock ───────────────────────────────────────────────────────────────

function EmptyBlock({
  icon,
  title,
  body,
}: Readonly<{
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}>) {
  return (
    <Animated.View entering={FadeInDown.duration(350).springify()} style={styles.emptyBlock}>
      <View style={styles.emptyRing}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={icon} size={32} color={colors.brand.light} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </Animated.View>
  );
}

// ─── Segmented tabs: sliding pill (no per-cell scale — avoids jump + label bugs) ─

function LibrarySegmentTabs({
  activeTab,
  onTabChange,
}: Readonly<{
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}>) {
  const [measuredW, setMeasuredW] = useState(0);
  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillLaidOut = useRef(false);

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const safeIndex = activeIndex < 0 ? 0 : activeIndex;

  useEffect(() => {
    if (measuredW <= 0) return;
    const inner = measuredW - SEG_OUTER_PAD * 2;
    const slotW = (inner - SEG_GAP * (TAB_COUNT - 1)) / TAB_COUNT;
    const x = SEG_OUTER_PAD + safeIndex * (slotW + SEG_GAP);
    if (!pillLaidOut.current) {
      pillLaidOut.current = true;
      pillWidth.value = slotW;
      translateX.value = x;
      return;
    }
    const fromX = translateX.value;
    const fromW = pillWidth.value;
    const travel = Math.max(Math.abs(x - fromX), Math.abs(slotW - fromW));
    const duration = Math.min(
      SEG_PILL_DURATION_MAX,
      Math.max(SEG_PILL_DURATION_MIN, travel * SEG_PILL_MS_PER_PX)
    );
    const timing = { duration, easing: segPillEasing };
    cancelAnimation(translateX);
    cancelAnimation(pillWidth);
    pillWidth.value = withTiming(slotW, timing);
    translateX.value = withTiming(x, timing);
  }, [measuredW, safeIndex, translateX, pillWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    transform: [{ translateX: translateX.value }],
    opacity: pillWidth.value > 0 ? 1 : 0,
  }));

  return (
    <View
      style={styles.segmentOuter}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setMeasuredW((prev) =>
          prev > 0 && Math.abs(prev - w) < SEG_LAYOUT_WIDTH_EPS ? prev : w
        );
      }}
    >
      <Animated.View style={[styles.segmentPill, pillStyle]} pointerEvents="none" />
      <View style={styles.segmentRow}>
        {TABS.map(({ id, label, icon, activeIcon }) => {
          const isActive = activeTab === id;
          return (
            <Pressable
              key={id}
              style={styles.segmentTouch}
              onPress={() => onTabChange(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
            >
              <Ionicons
                name={isActive ? activeIcon : icon}
                size={16}
                color={isActive ? colors.text.inverse : colors.text.secondary}
              />
              <Text
                style={[styles.segmentLabel, isActive ? styles.segmentLabelOn : styles.segmentLabelOff]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

function FAB({ onPress, isPending, bottom }: { onPress: () => void; isPending: boolean; bottom: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.fab, { bottom }, animStyle]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.9, { damping: 10 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10 }); }}
        disabled={isPending}
        style={styles.fabInner}
        accessibilityRole="button"
        accessibilityLabel="Create playlist"
      >
        {isPending ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Ionicons name="add" size={26} color={colors.text.inverse} />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── LibraryScreen ────────────────────────────────────────────────────────────

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [tab, setTab] = useState<Tab>('playlists');
  const qc = useQueryClient();
  const { playQueue } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  // ── Data ────────────────────────────────────────────────────────────────────

  const playlistsQ = useQuery({
    queryKey: queryKeys.playlists(userId ?? ''),
    queryFn: () => getUserPlaylists(userId!),
    enabled: !!userId && !isGuest,
    staleTime: 30_000,
  });

  const createM = useMutation({
    mutationFn: () => createPlaylist(userId!, `Playlist ${new Date().toLocaleString()}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playlists(userId ?? '') }),
  });

  const likedIds = useMemo(
    () => (user ? parseJsonArray<string>(user.likedSongs, []) : []),
    [user]
  );
  const historyIds = useMemo(
    () => (user ? parseJsonArray<string>(user.recentlyPlayed, []) : []),
    [user]
  );

  const likedSongsQ = useQuery({
    queryKey: queryKeys.likedSongs(likedIds.join(',')),
    queryFn: async () => {
      const results = await Promise.allSettled(
        likedIds.slice(0, 50).map((id) => getSongById(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<JioSaavnSong> => r.status === 'fulfilled' && !!r.value)
        .map((r) => r.value);
    },
    enabled: !!userId && tab === 'liked' && likedIds.length > 0,
    staleTime: 60_000,
  });

  const historyQ = useQuery({
    queryKey: queryKeys.likedSongs(`h-${historyIds.join(',')}`),
    queryFn: async () => {
      const results = await Promise.allSettled(
        historyIds.slice(0, 50).map((id) => getSongById(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<JioSaavnSong> => r.status === 'fulfilled' && !!r.value)
        .map((r) => r.value);
    },
    enabled: !!userId && tab === 'history' && historyIds.length > 0,
    staleTime: 60_000,
  });

  // ── Derived ─────────────────────────────────────────────────────────────────

  const fabBottom = insets.bottom + layout.tabBarHeight + spacing[3];
  const playlistCount = playlistsQ.data?.length ?? 0;
  const likedCount = likedIds.length;
  const historyCount = historyIds.length;

  const sectionSubtitle = useMemo(() => {
    if (tab === 'playlists') {
      if (playlistsQ.isLoading) return 'Loading…';
      return playlistCount === 0
        ? 'Create a playlist to get started'
        : `${playlistCount} playlist${playlistCount === 1 ? '' : 's'}`;
    }
    if (tab === 'liked') {
      if (likedCount === 0) return 'Tracks you heart appear here';
      if (likedSongsQ.isLoading) return 'Loading…';
      return `${likedCount} song${likedCount === 1 ? '' : 's'}`;
    }
    if (historyCount === 0) return 'Recently played shows up here';
    if (historyQ.isLoading) return 'Loading…';
    return `${historyCount} recent ${historyCount === 1 ? 'track' : 'tracks'}`;
  }, [tab, playlistCount, likedCount, historyCount, playlistsQ.isLoading, likedSongsQ.isLoading, historyQ.isLoading]);

  // ── Renderers ────────────────────────────────────────────────────────────────
  // Using useCallback with stable deps — render fns don't change identity unless needed

  const renderPlaylist: ListRenderItem<MockAPIPlaylistRow> = useCallback(
    ({ item }) => (
      <PlaylistCard
        playlist={item}
        onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}
      />
    ),
    [navigation]
  );

  const renderLikedSong: ListRenderItem<JioSaavnSong> = useCallback(
    ({ item, index }) => (
      <SongRow
        song={item}
        onPress={() => void playQueue(likedSongsQ.data ?? [], index)}
        liked={isLiked(item.id)}
        onToggleLike={() => void toggleLike(item.id, true)}
        showLike
        showAddToPlaylist
        onAddToPlaylist={() => openAddToPlaylist(item)}
      />
    ),
    [playQueue, likedSongsQ.data, isLiked, toggleLike, openAddToPlaylist]
  );

  const renderHistorySong: ListRenderItem<JioSaavnSong> = useCallback(
    ({ item, index }) => (
      <SongRow
        song={item}
        onPress={() => void playQueue(historyQ.data ?? [], index)}
        liked={isLiked(item.id)}
        onToggleLike={() => void toggleLike(item.id, isLiked(item.id))}
        showLike
        showAddToPlaylist
        onAddToPlaylist={() => openAddToPlaylist(item)}
      />
    ),
    [playQueue, historyQ.data, isLiked, toggleLike, openAddToPlaylist]
  );

  const listPad = useMemo(
    () => ({
      paddingHorizontal: layout.screenPadding,
      paddingBottom: layout.tabBarHeight + layout.miniPlayerHeight + spacing[8],
    }),
    []
  );

  // ── Guest gate ───────────────────────────────────────────────────────────────

  if (isGuest || !userId) {
    return (
      <ScreenWrapper>
        <View style={styles.guestWrap}>
          <EmptyBlock
            icon="library-outline"
            title="Your library"
            body="Sign in to save playlists, liked songs, and listening history across sessions."
          />
        </View>
      </ScreenWrapper>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────

  return (
    <ScreenErrorBoundary>
      <ScreenWrapper style={styles.screenNoHPad}>
        <View style={styles.root}>

          {/* ── Header ── */}
          <View style={[styles.header, { paddingHorizontal: layout.screenPadding }]}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.pageTitle}>Library</Text>
                <Text style={styles.pageSub}>Your playlists, likes & history</Text>
              </View>
              {/* Count badge */}
              {tab === 'playlists' && playlistCount > 0 && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.countBadge}>
                  <Text style={styles.countBadgeTxt}>{playlistCount}</Text>
                </Animated.View>
              )}
            </View>

            <LibrarySegmentTabs activeTab={tab} onTabChange={setTab} />

            {/* ── Section meta row ── */}
            <View style={styles.sectionMetaRow}>
              <Text style={styles.sectionMeta}>{sectionSubtitle}</Text>
              {tab === 'playlists' && playlistCount > 0 ? (
                <Pressable
                  onPress={() => createM.mutate()}
                  disabled={createM.isPending}
                  style={styles.inlineNew}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="New playlist"
                >
                  {createM.isPending ? (
                    <ActivityIndicator size="small" color={colors.brand.light} />
                  ) : (
                    <>
                      <View style={styles.inlineNewIcon}>
                        <Ionicons name="add" size={14} color={colors.text.inverse} />
                      </View>
                      <Text style={styles.inlineNewTxt}>New</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* ── Body ── */}
          <Animated.View style={styles.body} layout={Layout.duration(220).easing(Easing.out(Easing.cubic))}>

            {/* Playlists tab */}
            {tab === 'playlists' ? (
              playlistsQ.isLoading ? (
                <View style={styles.skeletonPlaylistWrap}>
                  <LibraryPlaylistSkeleton />
                </View>
              ) : playlistsQ.isError ? (
                <View style={styles.bodyCenter}>
                  <ErrorState
                    message="Could not load playlists"
                    onRetry={() => void playlistsQ.refetch()}
                  />
                </View>
              ) : (
                <FlatList<MockAPIPlaylistRow>
                  style={styles.list}
                  contentContainerStyle={[listPad, !playlistCount && styles.listEmptyGrow]}
                  data={playlistsQ.data ?? []}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  // Performance props
                  removeClippedSubviews
                  initialNumToRender={12}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  ListEmptyComponent={
                    <EmptyBlock
                      icon="add-circle-outline"
                      title="No playlists yet"
                      body="Tap New above or the + button to create your first playlist."
                    />
                  }
                  renderItem={renderPlaylist}
                />
              )
            ) : null}

            {/* Liked songs tab */}
            {tab === 'liked' ? (
              likedCount === 0 ? (
                <View style={[styles.bodyFlex, listPad]}>
                  <EmptyBlock
                    icon="heart-outline"
                    title="No liked songs"
                    body="Tap the heart on any track while signed in to collect songs here."
                  />
                </View>
              ) : likedSongsQ.isLoading ? (
                <View style={[styles.skeletonPad, { paddingHorizontal: layout.screenPadding }]}>
                  {Array.from({ length: 6 }, (_, i) => <SongRowSkeleton key={i} />)}
                </View>
              ) : (
                <FlatList<JioSaavnSong>
                  style={styles.list}
                  contentContainerStyle={listPad}
                  data={likedSongsQ.data ?? []}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews
                  initialNumToRender={12}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  renderItem={renderLikedSong}
                />
              )
            ) : null}

            {/* History tab */}
            {tab === 'history' ? (
              historyCount === 0 ? (
                <View style={[styles.bodyFlex, listPad]}>
                  <EmptyBlock
                    icon="musical-notes-outline"
                    title="No history yet"
                    body="Play something — your recent tracks will show up here automatically."
                  />
                </View>
              ) : historyQ.isLoading ? (
                <View style={[styles.skeletonPad, { paddingHorizontal: layout.screenPadding }]}>
                  {Array.from({ length: 6 }, (_, i) => <SongRowSkeleton key={i} />)}
                </View>
              ) : (
                <FlatList<JioSaavnSong>
                  style={styles.list}
                  contentContainerStyle={listPad}
                  data={historyQ.data ?? []}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews
                  initialNumToRender={12}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  renderItem={renderHistorySong}
                />
              )
            ) : null}
          </Animated.View>

          {/* FAB */}
          {tab === 'playlists' && playlistCount > 0 ? (
            <FAB
              onPress={() => createM.mutate()}
              isPending={createM.isPending}
              bottom={fabBottom}
            />
          ) : null}
        </View>
      </ScreenWrapper>
    </ScreenErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenNoHPad: { paddingHorizontal: 0 },
  root: { flex: 1 },

  // Header
  header: {
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize['3xl'],
    color: colors.text.primary,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  pageSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  countBadge: {
    marginTop: 6,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  countBadgeTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },

  // Tabs — track + sliding pill
  segmentOuter: {
    marginTop: spacing[4],
    padding: SEG_OUTER_PAD,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    position: 'relative',
    overflow: 'hidden',
  },
  segmentPill: {
    position: 'absolute',
    top: SEG_OUTER_PAD,
    bottom: SEG_OUTER_PAD,
    left: 0,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.brand.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  segmentRow: {
    flexDirection: 'row',
    zIndex: 1,
  },
  segmentTouch: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3] - 1,
    paddingHorizontal: spacing[1],
    gap: spacing[1],
  },
  segmentLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  /** Inactive: explicit secondary so labels never “vanish” after toggling */
  segmentLabelOff: {
    color: colors.text.secondary,
  },
  segmentLabelOn: {
    color: colors.text.inverse,
  },

  // Meta row
  sectionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    minHeight: 24,
  },
  sectionMeta: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  inlineNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  inlineNewIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineNewTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.brand.light,
  },

  // Body
  body: { flex: 1, minHeight: 0 },
  bodyFlex: { flex: 1, justifyContent: 'center', minHeight: 280 },
  bodyCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  list: { flex: 1 },
  listEmptyGrow: { flexGrow: 1, justifyContent: 'center' },
  skeletonPad: { paddingBottom: layout.tabBarHeight + spacing[8] },
  skeletonPlaylistWrap: { flex: 1, paddingTop: spacing[2] },

  // Empty state
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
  },
  emptyRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.12)',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 270,
  },

  // Guest
  guestWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },

  // FAB
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});