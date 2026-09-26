/**
 * NowPlayingScreen — full-screen player (blur + art backdrop).
 * Surfaces and chips follow Profile/Library cards and {@link PlayerControls} icon wells.
 */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Platform,
  Animated,
  FlatList,
  Modal,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgress, useActiveTrack } from 'react-native-track-player';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from '../components/ui/BlurView';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { addRecentlyPlayed, parseJsonArray } from '../api/mockapi';
import type { JioSaavnSong } from '../api/jiosaavn';
import { getSongById } from '../api/jiosaavn';
import { queryKeys } from '../hooks/queryKeys';
import { CoverImage } from '../components/ui/CoverImage';
import { NowPlayingSkeleton } from '../components/ui/PageSkeletons';
import { LanguageBadge } from '../components/ui/LanguageBadge';
import { SongRow } from '../components/cards/SongRow';
import { ProgressBar } from '../components/player/ProgressBar';
import { PlayerControls } from '../components/player/PlayerControls';
import { SleepTimerModal } from '../components/player/SleepTimerModal';
import { LyricsModal } from '../components/player/LyricsModal';
import { useSleepTimerStore } from '../store/sleepTimerStore';
import { useAddToPlaylist } from '../context/AddToPlaylistContext';
import { formatTime } from '../utils/formatTime';
import { getAlbumNameSafe, getPrimaryArtistNames } from '../utils/songHelpers';
import { resolveNowPlayingCoverUrl } from '../utils/coverArt';
import type { MainAppStackParamList } from '../navigation/types';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../theme';

type MainNav = NativeStackNavigationProp<MainAppStackParamList>;

/** Matches Profile card shell + PlayerControls active wells (obsidian glass on Midnight Black). */
const NP = {
  cardFill: 'rgba(28, 28, 35, 0.75)',
  border: 'rgba(41, 41, 50, 0.65)',
  borderGlow: 'rgba(139, 92, 246, 0.28)',
  well: 'rgba(28, 28, 35, 0.6)',
  activeWell: 'rgba(139, 92, 246, 0.16)',
  rowLine: 'rgba(41, 41, 50, 0.5)',
  vignette: 'rgba(11, 11, 15, 0.65)',
  sheen: 'rgba(248, 248, 250, 0.04)',
} as const;

// ─── Spring configs ────────────────────────────────────────────────────────────
const SPRING_SOFT = { friction: 9, tension: 120, useNativeDriver: true } as const;
const SPRING_SNAP = { friction: 6, tension: 200, useNativeDriver: true } as const;
const SPRING_BOUNCE = { friction: 5, tension: 280, useNativeDriver: true } as const;

const BAR_COUNT = 28;

const WaveformVisualizer = memo(function WaveformVisualizer({
  isPlaying,
}: {
  isPlaying: boolean;
}) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(Math.random()))
  ).current;

  useEffect(() => {
    let looping = true;

    function animate() {
      if (!looping) return;
      Animated.parallel(
        anims.map((a) =>
          Animated.timing(a, {
            toValue: 0.15 + Math.random() * 0.85,
            duration: 160 + Math.random() * 320,
            useNativeDriver: true,
          })
        )
      ).start(() => {
        if (looping) animate();
      });
    }

    if (isPlaying) {
      animate();
    } else {
      // Settle all bars to a quiet flat line
      Animated.parallel(
        anims.map((a) =>
          Animated.spring(a, { toValue: 0.2, ...SPRING_SOFT })
        )
      ).start();
    }

    return () => {
      looping = false;
    };
  }, [isPlaying, anims]);

  return (
    <View style={wfStyles.row} accessibilityLabel="Audio visualizer" accessibilityRole="image">
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            wfStyles.bar,
            {
              transform: [{ scaleY: anim }],
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
            },
          ]}
        />
      ))}
    </View>
  );
});

const wfStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 18,
    marginBottom: 4,
  },
  bar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.brand.light,
    transformOrigin: 'bottom',
  },
});

// ─── Heart burst animation ────────────────────────────────────────────────────
function HeartBurst({ visible }: { visible: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.6, ...SPRING_BOUNCE }),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.2, ...SPRING_SOFT }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.heartBurstWrap,
        { transform: [{ scale }], opacity },
      ]}
    >
      <Ionicons name="heart" size={72} color={colors.accent.pink} />
    </Animated.View>
  );
}

// ─── Queue Sheet (swipe down to close, Up Next & Favorites tabs) ─────────────
const QueueSheet = memo(function QueueSheet({
  visible,
  queue,
  onClose,
  onPlayIndex,
  onPlayFavorites,
  userId,
  userLikedSongs,
  isLiked,
  toggleLike,
  openAddToPlaylist,
}: Readonly<{
  visible: boolean;
  queue: JioSaavnSong[];
  onClose: () => void;
  onPlayIndex: (index: number) => void;
  onPlayFavorites?: (songs: JioSaavnSong[], index: number) => void;
  userId: string | null;
  userLikedSongs?: string;
  isLiked: (id: string) => boolean;
  toggleLike: (id: string, liked: boolean) => void;
  openAddToPlaylist: (song: JioSaavnSong) => void;
}>) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'queue' | 'favorites'>('queue');
  const panY = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      panY.setValue(0);
    }
  }, [visible, panY]);

  const handleClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.timing(panY, {
      toValue: 700,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose, panY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0 && !isClosing.current) {
            panY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isClosing.current) return;
          if (gestureState.dy > 50 || gestureState.vy > 0.4) {
            handleClose();
          } else {
            Animated.spring(panY, {
              toValue: 0,
              friction: 8,
              tension: 200,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [handleClose, panY]
  );

  const likedIds = useMemo(
    () => (userLikedSongs ? parseJsonArray<string>(userLikedSongs, []) : []),
    [userLikedSongs]
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
    enabled: visible && activeTab === 'favorites' && !!userId && likedIds.length > 0,
    staleTime: 60_000,
  });

  const favoriteSongs = likedSongsQ.data ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.sheetBackdrop} onPress={handleClose} />
      <Animated.View
        style={[
          styles.sheet,
          styles.queueSheet,
          {
            paddingBottom: Math.max(insets.bottom, spacing[4]),
            transform: [{ translateY: panY }],
          },
        ]}
      >
        {/* Swipe-down drag header */}
        <View {...panResponder.panHandlers} style={styles.sheetDragHeader}>
          <View style={styles.sheetHandle} />
          <View style={styles.queueHeaderRow}>
            <View style={styles.queueTabRow}>
              <Pressable
                style={[styles.queueTabBtn, activeTab === 'queue' && styles.queueTabBtnActive]}
                onPress={() => setActiveTab('queue')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'queue' }}
              >
                <Ionicons
                  name="list"
                  size={15}
                  color={activeTab === 'queue' ? colors.brand.light : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.queueTabText,
                    activeTab === 'queue' && styles.queueTabTextActive,
                  ]}
                >
                  Up Next ({queue.length})
                </Text>
              </Pressable>

              {userId ? (
                <Pressable
                  style={[styles.queueTabBtn, activeTab === 'favorites' && styles.queueTabBtnActive]}
                  onPress={() => setActiveTab('favorites')}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === 'favorites' }}
                >
                  <Ionicons
                    name="heart"
                    size={14}
                    color={activeTab === 'favorites' ? colors.accent.pink : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.queueTabText,
                      activeTab === 'favorites' && styles.queueTabTextActive,
                    ]}
                  >
                    Favorites ({likedIds.length})
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={styles.sheetCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close queue"
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Content list */}
        {activeTab === 'queue' ? (
          queue.length === 0 ? (
            <View style={styles.queueEmptyWrap}>
              <Ionicons name="musical-notes-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.queueEmptyText}>Queue is empty</Text>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.queueListContent}
              keyboardShouldPersistTaps="handled"
              onScrollEndDrag={(e) => {
                if (e.nativeEvent.contentOffset.y < -35) {
                  handleClose();
                }
              }}
              renderItem={({ item, index: rowIndex }) => (
                <SongRow
                  song={item}
                  index={rowIndex + 1}
                  onPress={() => {
                    onPlayIndex(rowIndex);
                    handleClose();
                  }}
                  liked={isLiked(item.id)}
                  onToggleLike={
                    userId ? () => toggleLike(item.id, isLiked(item.id)) : undefined
                  }
                  showLike={!!userId}
                  showAddToPlaylist={!!userId}
                  onAddToPlaylist={userId ? () => openAddToPlaylist(item) : undefined}
                />
              )}
            />
          )
        ) : !userId ? (
          <View style={styles.queueEmptyWrap}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.text.tertiary} />
            <Text style={styles.queueEmptyText}>Sign in to view favorite songs</Text>
          </View>
        ) : likedIds.length === 0 ? (
          <View style={styles.queueEmptyWrap}>
            <Ionicons name="heart-outline" size={32} color={colors.text.tertiary} />
            <Text style={styles.queueEmptyText}>No favorite songs yet</Text>
            <Text style={styles.queueEmptySubText}>
              Tap the heart icon on any track to save it here
            </Text>
          </View>
        ) : likedSongsQ.isLoading ? (
          <View style={styles.queueLoadingWrap}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
            <Text style={styles.queueLoadingText}>Loading favorites…</Text>
          </View>
        ) : favoriteSongs.length === 0 ? (
          <View style={styles.queueEmptyWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.text.tertiary} />
            <Text style={styles.queueEmptyText}>Unable to load favorites</Text>
          </View>
        ) : (
          <FlatList
            data={favoriteSongs}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.queueListContent}
            keyboardShouldPersistTaps="handled"
            onScrollEndDrag={(e) => {
              if (e.nativeEvent.contentOffset.y < -35) {
                handleClose();
              }
            }}
            renderItem={({ item, index: rowIndex }) => (
              <SongRow
                song={item}
                index={rowIndex + 1}
                onPress={() => {
                  if (onPlayFavorites) {
                    onPlayFavorites(favoriteSongs, rowIndex);
                  }
                  handleClose();
                }}
                liked={isLiked(item.id)}
                onToggleLike={
                  userId ? () => toggleLike(item.id, isLiked(item.id)) : undefined
                }
                showLike={!!userId}
                showAddToPlaylist={!!userId}
                onAddToPlaylist={userId ? () => openAddToPlaylist(item) : undefined}
              />
            )}
          />
        )}
      </Animated.View>
    </Modal>
  );
});

// ─── Empty state ───────────────────────────────────────────────────────────────
function NowPlayingEmpty({
  paddingTop,
  paddingBottom,
  onClose,
}: Readonly<{ paddingTop: number; paddingBottom: number; onClose: () => void }>) {
  const iconAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...SPRING_SOFT }),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(iconAnim, { toValue: 1, ...SPRING_SNAP }),
      ]),
    ]).start();
  }, []);

  const iconScale = iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View
      style={[
        styles.empty,
        { paddingTop, paddingBottom, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Animated.View style={[styles.emptyIconWrap, { transform: [{ scale: iconScale }] }]}>
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        <Ionicons name="musical-notes-outline" size={40} color={colors.brand.light} />
      </Animated.View>
      <Text style={styles.emptyTitle}>Nothing playing</Text>
      <Text style={styles.emptySub}>Browse your library or the home feed to start listening.</Text>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.closeChip, pressed && styles.closeChipPressed]}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="chevron-down" size={20} color={colors.text.inverse} />
        <Text style={styles.closeChipTxt}>Close</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Like button ──────────────────────────────────────────────────────────────
const LikeButton = memo(function LikeButton({
  liked,
  onPress,
}: Readonly<{ liked: boolean; onPress: () => void }>) {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, ...SPRING_BOUNCE }).start();
    onPress();
  }, [scale, onPress]);

  return (
    <Pressable
      onPress={bounce}
      hitSlop={14}
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Remove from liked songs' : 'Add to liked songs'}
    >
      <Animated.View style={[styles.likeWrap, { transform: [{ scale }] }]}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={26}
          color={liked ? colors.accent.pink : colors.text.tertiary}
        />
      </Animated.View>
    </Pressable>
  );
});

/** Same interaction pattern as {@link LikeButton} (spring tap + icon well). */
const AddToPlaylistIconButton = memo(function AddToPlaylistIconButton({
  onPress,
}: Readonly<{ onPress: () => void }>) {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, ...SPRING_BOUNCE }).start();
    onPress();
  }, [scale, onPress]);

  return (
    <Pressable
      onPress={bounce}
      hitSlop={14}
      accessibilityRole="button"
      accessibilityLabel="Add to playlist"
    >
      <Animated.View style={[styles.likeWrap, { transform: [{ scale }] }]}>
        <Ionicons name="add-circle-outline" size={26} color={colors.text.tertiary} />
      </Animated.View>
    </Pressable>
  );
});

// ─── Song meta block ───────────────────────────────────────────────────────────
const NowPlayingMeta = memo(function NowPlayingMeta({
  current,
  userId,
  liked,
  canOpenArtist,
  canOpenAlbum,
  onLike,
  onAddToPlaylist,
  onArtist,
  onAlbum,
}: Readonly<{
  current: JioSaavnSong;
  userId: string | null;
  liked: boolean;
  canOpenArtist: boolean;
  canOpenAlbum: boolean;
  onLike: () => void;
  onAddToPlaylist: () => void;
  onArtist: () => void;
  onAlbum: () => void;
}>) {
  const artistLabel = getPrimaryArtistNames(current);
  const albumLabel = getAlbumNameSafe(current);

  return (
    <View style={styles.titleBlock}>
      <View style={styles.titleRow}>
        <View style={styles.titleTextCol}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail" accessibilityRole="header">
            {current.name}
          </Text>

          <View style={styles.artistAlbumRow}>
            <Pressable
              onPress={onArtist}
              disabled={!canOpenArtist}
              style={({ pressed }) => [
                styles.artistPressable,
                canOpenArtist && pressed && styles.linkPressed,
              ]}
              accessibilityRole={canOpenArtist ? 'button' : 'text'}
              accessibilityLabel={canOpenArtist ? `Open artist ${artistLabel}` : undefined}
            >
              <Text
                style={[styles.artist, canOpenArtist ? styles.artistLink : styles.artistPlain]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {artistLabel}
              </Text>
            </Pressable>

            {canOpenAlbum && albumLabel ? (
              <>
                <Text style={styles.bulletDot}> • </Text>
                <Pressable
                  onPress={onAlbum}
                  style={({ pressed }) => [
                    styles.albumPressable,
                    pressed && styles.linkPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open album ${albumLabel}`}
                >
                  <Text style={styles.albumLine} numberOfLines={1} ellipsizeMode="tail">
                    {albumLabel}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {current.language ? (
              <View style={styles.badgeWrap}>
                <LanguageBadge language={current.language} />
              </View>
            ) : null}
          </View>
        </View>

        {userId ? (
          <View style={styles.metaActions}>
            <LikeButton liked={liked} onPress={onLike} />
            <AddToPlaylistIconButton onPress={onAddToPlaylist} />
          </View>
        ) : null}
      </View>
    </View>
  );
});

// ─── Cover art: swipe prev/next, double-tap like (no scale / fade animation) ───
function CoverArt({
  uri,
  size,
  songId,
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
}: Readonly<{
  uri: string | undefined;
  size: number;
  songId: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDoubleTap: () => void;
}>) {
  const hasArt = Boolean(uri?.trim());
  const [heartVisible, setHeartVisible] = useState(false);
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setHeartVisible(false);
      setTimeout(() => setHeartVisible(true), 16);
      onDoubleTap();
    }
    lastTapRef.current = now;
  }, [onDoubleTap]);

  // Swipe gesture
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-30, 30])
        .onEnd((e) => {
          'worklet';
          if (e.translationX < -48 || e.velocityX < -600) runOnJS(onSwipeLeft)();
          else if (e.translationX > 48 || e.velocityX > 600) runOnJS(onSwipeRight)();
        }),
    [onSwipeLeft, onSwipeRight]
  );

  return (
    <GestureDetector gesture={swipeGesture}>
      <Pressable
        onPress={handleTap}
        accessibilityRole="image"
        accessibilityLabel={hasArt ? 'Album artwork — double-tap to like' : 'No artwork'}
      >
        <View style={[styles.coverWrap, { width: size, height: size }]}>
          {hasArt ? (
            <CoverImage key={songId} uri={uri} size={size} radius={borderRadius.xl} />
          ) : (
            <View
              style={[
                styles.coverPlaceholder,
                { width: size, height: size, borderRadius: borderRadius.xl },
              ]}
            >
              <Ionicons
                name="musical-notes"
                size={Math.round(size * 0.22)}
                color={colors.text.tertiary}
              />
            </View>
          )}
          <View
            style={[styles.coverSheen, { width: size, borderRadius: borderRadius.xl }]}
            pointerEvents="none"
          />
          <HeartBurst visible={heartVisible} />
        </View>
      </Pressable>
    </GestureDetector>
  );
}

// ─── Top bar (stable memo — no inline arrow fns) ───────────────────────────────
const TopBar = memo(function TopBar({
  queueLabel,
  onClose,
  onQueue,
  onSleepTimer,
}: Readonly<{
  queueLabel: string | null;
  onClose: () => void;
  onQueue: () => void;
  onSleepTimer: () => void;
}>) {
  const closeScale = useRef(new Animated.Value(1)).current;
  const queueScale = useRef(new Animated.Value(1)).current;
  const sleepScale = useRef(new Animated.Value(1)).current;

  const isSleepActive = useSleepTimerStore((s) => s.isActive);
  const remainingSeconds = useSleepTimerStore((s) => s.remainingSeconds);
  const sleepMode = useSleepTimerStore((s) => s.mode);

  const formattedSleep =
    sleepMode === 'end_of_track'
      ? 'Track'
      : remainingSeconds != null
      ? remainingSeconds >= 60
        ? `${Math.ceil(remainingSeconds / 60)}m`
        : `${remainingSeconds}s`
      : null;

  const onClosePressIn = useCallback(
    () => Animated.spring(closeScale, { toValue: 0.88, ...SPRING_SNAP }).start(),
    [closeScale]
  );
  const onClosePressOut = useCallback(
    () => Animated.spring(closeScale, { toValue: 1, ...SPRING_SNAP }).start(),
    [closeScale]
  );
  const onQueuePressIn = useCallback(
    () => Animated.spring(queueScale, { toValue: 0.88, ...SPRING_SNAP }).start(),
    [queueScale]
  );
  const onQueuePressOut = useCallback(
    () => Animated.spring(queueScale, { toValue: 1, ...SPRING_SNAP }).start(),
    [queueScale]
  );
  const onSleepPressIn = useCallback(
    () => Animated.spring(sleepScale, { toValue: 0.88, ...SPRING_SNAP }).start(),
    [sleepScale]
  );
  const onSleepPressOut = useCallback(
    () => Animated.spring(sleepScale, { toValue: 1, ...SPRING_SNAP }).start(),
    [sleepScale]
  );

  return (
    <View style={styles.top}>
      {/* Close */}
      <Pressable
        onPress={onClose}
        onPressIn={onClosePressIn}
        onPressOut={onClosePressOut}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel="Close player"
      >
        <Animated.View style={[styles.closeBtn, { transform: [{ scale: closeScale }] }]}>
          <Ionicons name="chevron-down" size={22} color={colors.text.primary} />
        </Animated.View>
      </Pressable>

      {/* Center */}
      <View style={styles.topCenter}>
        {queueLabel ? (
          <Text style={styles.kicker} numberOfLines={1}>{queueLabel}</Text>
        ) : null}
        <Text style={styles.nowPlayingLabel} numberOfLines={1}>Now playing</Text>
      </View>

      {/* Right actions: Sleep timer + Queue */}
      <View style={styles.topRightActions}>
        <Pressable
          onPress={onSleepTimer}
          onPressIn={onSleepPressIn}
          onPressOut={onSleepPressOut}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isSleepActive ? `Sleep timer active, ${formattedSleep} remaining` : 'Set sleep timer'}
        >
          <Animated.View
            style={[
              styles.closeBtn,
              isSleepActive && styles.sleepActiveBtn,
              { transform: [{ scale: sleepScale }] },
            ]}
          >
            <Ionicons
              name={isSleepActive ? 'moon' : 'moon-outline'}
              size={18}
              color={isSleepActive ? colors.brand.light : colors.text.primary}
            />
            {isSleepActive && formattedSleep ? (
              <View style={styles.sleepBadge}>
                <Text style={styles.sleepBadgeText}>{formattedSleep}</Text>
              </View>
            ) : null}
          </Animated.View>
        </Pressable>

        <Pressable
          onPress={onQueue}
          onPressIn={onQueuePressIn}
          onPressOut={onQueuePressOut}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Open queue"
        >
          <Animated.View style={[styles.closeBtn, { transform: [{ scale: queueScale }] }]}>
            <Ionicons name="list" size={19} color={colors.text.primary} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
});

// ─── Lyrics button ────────────────────────────────────────────────────────────
const LyricsButton = memo(function LyricsButton({ onPress }: Readonly<{ onPress: () => void }>) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = useCallback(
    () => Animated.spring(scale, { toValue: 0.96, ...SPRING_SNAP }).start(),
    [scale]
  );
  const pressOut = useCallback(
    () => Animated.spring(scale, { toValue: 1, ...SPRING_SNAP }).start(),
    [scale]
  );
  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityLabel="Open lyrics"
    >
      <Animated.View style={[styles.lyricsBtn, { transform: [{ scale }] }]}>
        <View style={styles.lyricsBtnLeft}>
          <Ionicons name="text-outline" size={18} color={colors.brand.light} />
          <Text style={styles.lyricsTxt}>Lyrics</Text>
        </View>
        <View style={styles.lyricsChevronWrap}>
          <Ionicons name="chevron-forward" size={16} color={colors.brand.light} />
        </View>
      </Animated.View>
    </Pressable>
  );
});

// ─── Divider pill ─────────────────────────────────────────────────────────────
const DividerPill = memo(function DividerPill() {
  return <View style={styles.dividerPill} />;
});

// ─── Scrubber + time labels (isolated to prevent full-screen re-renders) ───────
const NowPlayingScrubber = memo(function NowPlayingScrubber({
  seekTo,
}: {
  seekTo: (sec: number) => void;
}) {
  const { position, duration } = useProgress(250);
  const [scrubHeldSec, setScrubHeldSec] = useState<number | null>(null);

  return (
    <View style={styles.scrubberBlock}>
      <ProgressBar
        duration={duration}
        position={position}
        onSeek={(s) => seekTo(s)}
        onHoldSecondsChange={setScrubHeldSec}
      />
      <View style={styles.times}>
        <Text style={styles.timeLabel}>{formatTime(scrubHeldSec ?? position)}</Text>
        <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
});



// ─── Main screen ──────────────────────────────────────────────────────────────
export function NowPlayingScreen() {
  const navigation = useNavigation<MainNav>();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const storeCurrent = usePlayerStore((s) => s.currentSong);
  const queue = usePlayerStore((s) => s.queue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const userId = useAuthStore((s) => s.userId);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const activeTrack = useActiveTrack();
  const {
    playQueue,
    togglePlay,
    skipToNext,
    skipToPrevious,
    skipToQueueIndex,
    seekTo,
    cycleRepeat,
    toggleShuffle,
  } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { openAddToPlaylist } = useAddToPlaylist();

  const [queueVisible, setQueueVisible] = useState(false);
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [lyricsModalVisible, setLyricsModalVisible] = useState(false);

  const current = useMemo(() => {
    if (storeCurrent) return storeCurrent;
    const id = activeTrack?.id;
    if (typeof id === 'string' && queue.length > 0) {
      return queue.find((s) => s.id === id) ?? null;
    }
    return null;
  }, [storeCurrent, activeTrack?.id, queue]);

  const expectingTrack = useMemo(
    () => queue.length > 0 || Boolean(activeTrack?.id),
    [queue.length, activeTrack?.id]
  );

  const [hydrateTimedOut, setHydrateTimedOut] = useState(false);

  useEffect(() => {
    if (current || !expectingTrack) {
      setHydrateTimedOut((prev) => (prev ? false : prev));
      return;
    }
    const t = setTimeout(() => setHydrateTimedOut(true), 2800);
    return () => clearTimeout(t);
  }, [current?.id, expectingTrack]);

  const queueIndex = useMemo(
    () => (current ? queue.findIndex((s) => s.id === current.id) : -1),
    [queue, current]
  );
  const queueLabel = useMemo(
    () =>
      queue.length > 0 && queueIndex >= 0
        ? `Track ${queueIndex + 1} of ${queue.length}`
        : null,
    [queue.length, queueIndex]
  );

  const art = useMemo(() => {
    if (!current) return '';
    return resolveNowPlayingCoverUrl(activeTrack, current);
  }, [activeTrack?.id, current?.id]);   // tight deps — don't include full objects

  const primaryArtist = useMemo(
    () => current?.artists?.primary?.[0],
    [current?.artists?.primary]
  );
  const canOpenArtist = Boolean(primaryArtist?.id);
  const canOpenAlbum = Boolean(current?.album?.id);

  const goToArtist = useCallback(() => {
    if (primaryArtist?.id == null) return;
    navigation.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'Artist', params: { artistId: primaryArtist.id } },
    });
    navigation.goBack();
  }, [navigation, primaryArtist?.id]);

  const goToAlbum = useCallback(() => {
    if (current?.album?.id == null) return;
    navigation.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'Album', params: { albumId: current.album.id } },
    });
    navigation.goBack();
  }, [navigation, current?.album?.id]);

  const goToLyrics = useCallback(() => {
    if (!current) return;
    navigation.navigate('Lyrics', { songId: current.id });
  }, [navigation, current?.id]);

  // ── Track recently played ──
  useEffect(() => {
    if (!current || !userId || !user) return;
    const ids = parseJsonArray<string>(user.recentlyPlayed, []);
    void (async () => {
      try {
        const updated = await addRecentlyPlayed(userId, current.id, ids);
        refreshUser(updated);
      } catch { /* ignore */ }
    })();
  }, [current?.id, userId]);   // stable — don't put user object in deps

  // ── Cover art swipe gestures ──
  const onSwipeLeft = useCallback(() => skipToNext(), [skipToNext]);
  const onSwipeRight = useCallback(() => skipToPrevious(), [skipToPrevious]);

  // ── Double-tap to like ──
  const onDoubleTapCover = useCallback(() => {
    if (!current) return;
    const liked = isLiked(current.id);
    if (!liked) toggleLike(current.id, liked);
  }, [current?.id, isLiked, toggleLike]);

  const onQueuePlayIndex = useCallback(
    (index: number) => {
      void skipToQueueIndex(index);
    },
    [skipToQueueIndex]
  );

  const onPlayFavorites = useCallback(
    (favSongs: JioSaavnSong[], index: number) => {
      void playQueue(favSongs, index);
    },
    [playQueue]
  );

  const swipeDownToClose = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-80, 80])
        .onEnd((e) => {
          'worklet';
          if (e.translationY > 52 || e.velocityY > 900) runOnJS(goBack)();
        }),
    [goBack]
  );

  // ── Loading skeleton ──
  if (!current && expectingTrack && !hydrateTimedOut) {
    return (
      <View style={styles.root}>
        <View style={[styles.bg, styles.fallbackBg]}>
          <GestureDetector gesture={swipeDownToClose}>
            <View style={styles.swipeDismissFill}>
              <NowPlayingSkeleton
                paddingTop={Math.max(insets.top, spacing[2])}
                paddingBottom={Math.max(insets.bottom, spacing[4])}
                onClose={goBack}
              />
            </View>
          </GestureDetector>
        </View>
      </View>
    );
  }

  // ── Empty state ──
  if (!current) {
    return (
      <GestureDetector gesture={swipeDownToClose}>
        <View style={styles.swipeDismissFill}>
          <NowPlayingEmpty
            paddingTop={insets.top + spacing[4]}
            paddingBottom={insets.bottom}
            onClose={goBack}
          />
        </View>
      </GestureDetector>
    );
  }

  const liked = isLiked(current.id);
  const coverSize = Math.min(
    Math.round(screenWidth * 0.78),
    Math.round(screenHeight * 0.40),
    350
  );
  const topPad = Math.max(insets.top, spacing[2]) + 35;
  const hasBgArt = art.trim().length > 0;

  return (
    <View style={styles.root}>
      {/* ── Background layer — keyed to current.id to replace image on track change ── */}
      <View style={[styles.bg, styles.fallbackBg]}>
        {hasBgArt ? (
          <ImageBackground
            key={current.id}  // ← ensures the node is replaced, not diff-updated
            source={{ uri: art }}
            style={StyleSheet.absoluteFill}
            blurRadius={40}
            resizeMode="cover"
          />
        ) : null}
        {hasBgArt ? (
          <View style={[StyleSheet.absoluteFill, styles.vignette]} pointerEvents="none" />
        ) : null}

        {/* ── Content ── */}
        <BlurView intensity={Platform.OS === 'ios' ? 48 : 72} tint="dark" style={styles.blur}>
          <View style={styles.blurInner}>
            {/* Top bar slot */}
            <View style={[styles.topBarSlot, { paddingTop: topPad, paddingHorizontal: layout.screenPadding }]}>
              <GestureDetector gesture={swipeDownToClose}>
                <View>
                  <TopBar
                    queueLabel={queueLabel}
                    onClose={goBack}
                    onQueue={() => setQueueVisible(true)}
                    onSleepTimer={() => setSleepTimerVisible(true)}
                  />
                </View>
              </GestureDetector>
            </View>

            {/* Main content: Full Player Hero with balanced vertical distribution */}
            <GestureDetector gesture={swipeDownToClose}>
              <View
                style={[
                  styles.mainLayout,
                  {
                    paddingHorizontal: layout.screenPadding,
                    paddingBottom: Math.max(insets.bottom, spacing[4]),
                  },
                ]}
              >
                {/* ── Center Hero: Large Album Art + Visualizer ── */}
                <View style={styles.heroSection}>
                  <CoverArt
                    uri={art || undefined}
                    size={coverSize}
                    songId={current.id}
                    onSwipeLeft={onSwipeLeft}
                    onSwipeRight={onSwipeRight}
                    onDoubleTap={onDoubleTapCover}
                  />

                  {/* ── Waveform visualizer ── */}
                  <WaveformVisualizer isPlaying={isPlaying} />
                </View>

                {/* ── Song Meta + Controls Block ── */}
                <View style={styles.controlsSection}>
                  {/* ── Meta (Song title, artist, album, language, like) ── */}
                  <NowPlayingMeta
                    current={current}
                    userId={userId}
                    liked={liked}
                    canOpenArtist={canOpenArtist}
                    canOpenAlbum={canOpenAlbum}
                    onLike={() => toggleLike(current.id, liked)}
                    onAddToPlaylist={() => openAddToPlaylist(current)}
                    onArtist={goToArtist}
                    onAlbum={goToAlbum}
                  />

                  {/* ── Scrubber + time labels ── */}
                  <NowPlayingScrubber seekTo={seekTo} />

                  {/* ── Playback controls (Shuffle, Prev, Play/Pause, Next, Repeat) ── */}
                  <View style={styles.playerControlsWrap}>
                    <PlayerControls
                      isPlaying={isPlaying}
                      shuffle={shuffle}
                      repeat={repeat}
                      onPrev={skipToPrevious}
                      onNext={skipToNext}
                      onTogglePlay={togglePlay}
                      onShuffle={toggleShuffle}
                      onRepeat={cycleRepeat}
                    />
                  </View>

                  {/* ── Bottom Utility Bar (Sleep Timer, Lyrics, Queue) ── */}
                  <View style={styles.bottomUtilityRow}>
                    <Pressable
                      onPress={() => setSleepTimerVisible(true)}
                      style={({ pressed }) => [
                        styles.utilityChip,
                        useSleepTimerStore.getState().isActive && styles.utilityChipActive,
                        pressed && styles.utilityChipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Set sleep timer"
                    >
                      <Ionicons
                        name={useSleepTimerStore.getState().isActive ? 'moon' : 'moon-outline'}
                        size={16}
                        color={useSleepTimerStore.getState().isActive ? colors.brand.light : colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.utilityChipText,
                          useSleepTimerStore.getState().isActive && styles.utilityChipTextActive,
                        ]}
                      >
                        {useSleepTimerStore.getState().isActive
                          ? useSleepTimerStore.getState().mode === 'end_of_track'
                            ? 'Stops: Track'
                            : `Stops in ${Math.ceil((useSleepTimerStore.getState().remainingSeconds ?? 0) / 60)}m`
                          : 'Sleep Timer'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setLyricsModalVisible(true)}
                      style={({ pressed }) => [
                        styles.utilityChip,
                        lyricsModalVisible && styles.utilityChipActive,
                        pressed && styles.utilityChipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Open lyrics modal"
                    >
                      <Ionicons
                        name="text-outline"
                        size={16}
                        color={lyricsModalVisible ? colors.brand.light : colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.utilityChipText,
                          lyricsModalVisible && styles.utilityChipTextActive,
                        ]}
                      >
                        Lyrics
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setQueueVisible(true)}
                      style={({ pressed }) => [
                        styles.utilityChip,
                        pressed && styles.utilityChipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Open queue"
                    >
                      <Ionicons name="list" size={16} color={colors.text.secondary} />
                      <Text style={styles.utilityChipText}>
                        Up Next {queue.length > 0 ? `(${queue.length})` : ''}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </GestureDetector>
          </View>
        </BlurView>
      </View>

      {/* ── Queue sheet ── */}
      <QueueSheet
        visible={queueVisible}
        queue={queue}
        onClose={() => setQueueVisible(false)}
        onPlayIndex={onQueuePlayIndex}
        onPlayFavorites={onPlayFavorites}
        userId={userId}
        userLikedSongs={user?.likedSongs}
        isLiked={isLiked}
        toggleLike={toggleLike}
        openAddToPlaylist={openAddToPlaylist}
      />

      {/* ── Sleep Timer sheet ── */}
      <SleepTimerModal
        visible={sleepTimerVisible}
        onClose={() => setSleepTimerVisible(false)}
      />

      {/* ── Lyrics modal with Tamil and English support ── */}
      <LyricsModal
        visible={lyricsModalVisible}
        onClose={() => setLyricsModalVisible(false)}
        currentSong={current}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  bg: { flex: 1, width: '100%' },
  fallbackBg: { backgroundColor: colors.bg.secondary },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NP.vignette,
  },
  blur: { flex: 1 },
  blurInner: { flex: 1 },
  topBarSlot: { width: '100%' },
  mainLayout: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: spacing[3],
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsSection: {
    width: '100%',
    alignItems: 'center',
  },
  playerControlsWrap: {
    width: '100%',
    marginTop: spacing[3],
    marginBottom: spacing[2],
    alignItems: 'center',
  },
  bottomUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    width: '100%',
    marginTop: spacing[2],
  },
  utilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing[3] + 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(28, 28, 35, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(41, 41, 50, 0.65)',
  },
  utilityChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    borderColor: 'rgba(139, 92, 246, 0.55)',
  },
  utilityChipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  utilityChipText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs + 1,
    color: colors.text.secondary,
  },
  utilityChipTextActive: {
    fontFamily: fonts.bold,
    color: colors.brand.light,
  },
  swipeDismissFill: { flex: 1 },

  // ── Top bar ──
  top: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: NP.well,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NP.border,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sleepActiveBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    borderColor: 'rgba(139, 92, 246, 0.55)',
  },
  sleepBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.bg.primary,
  },
  sleepBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: '#FFF',
  },
  kicker: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  nowPlayingLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // ── Cover ──
  coverWrap: {
    marginBottom: spacing[2],
    position: 'relative',
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 28,
      },
      android: { elevation: 12 },
    }),
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NP.border,
  },
  coverSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '36%',
    backgroundColor: NP.sheen,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  heartBurstWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
  },

  // ── Meta ──
  titleBlock: { width: '100%', marginBottom: spacing[1], marginTop: spacing[1] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleTextCol: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
    overflow: 'hidden',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl + 2,
    color: colors.text.primary,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  artistAlbumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    marginTop: 3,
    width: '100%',
    overflow: 'hidden',
  },
  artistPressable: {
    flexShrink: 1,
    minWidth: 0,
  },
  artist: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
  },
  artistLink: { color: colors.brand.light },
  artistPlain: { color: colors.text.secondary },
  bulletDot: {
    color: colors.text.tertiary,
    fontSize: 10,
    marginHorizontal: 3,
    flexShrink: 0,
  },
  albumPressable: {
    flexShrink: 2,
    minWidth: 0,
  },
  albumLine: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  badgeWrap: {
    marginLeft: spacing[2],
    flexShrink: 0,
  },
  chevronHint: { color: colors.text.tertiary, fontFamily: fonts.regular },
  linkPressed: { opacity: 0.72 },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    flexShrink: 0,
  },
  likeWrap: {
    padding: spacing[1],
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scrubber ──
  scrubberBlock: { width: '100%', marginTop: spacing[2] },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
    marginTop: 4,
  },
  timeLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },

  // ── Divider ──
  dividerPill: {
    width: 40,
    height: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: NP.rowLine,
    marginVertical: spacing[4],
    alignSelf: 'center',
  },

  // ── Lyrics button ──
  lyricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: NP.cardFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NP.border,
    width: '100%',
  },
  lyricsBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] + 2 },
  lyricsTxt: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.brand.light },
  lyricsChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: NP.well,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NP.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Bottom sheet shell ──
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.75)',
  },
  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: NP.border,
    paddingTop: spacing[3],
    paddingHorizontal: layout.screenPadding,
    maxHeight: '85%',
  },
  queueSheet: { maxHeight: '85%' },
  sheetDragHeader: {
    width: '100%',
    paddingBottom: spacing[2],
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  queueTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  queueTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(28, 28, 35, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(41, 41, 50, 0.6)',
  },
  queueTabBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  queueTabText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs + 1,
    color: colors.text.tertiary,
  },
  queueTabTextActive: {
    fontFamily: fonts.bold,
    color: colors.text.primary,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueListContent: {
    paddingBottom: spacing[4],
    paddingHorizontal: 0,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  queueEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2],
  },
  queueEmptyText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  queueEmptySubText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  queueLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2],
  },
  queueLoadingText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },

  // ── Empty state ──
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
    paddingHorizontal: layout.screenPadding,
    gap: spacing[2],
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NP.border,
    backgroundColor: NP.well,
    marginBottom: spacing[3],
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
    marginTop: spacing[2],
    letterSpacing: -0.2,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[5],
    maxWidth: 260,
  },
  closeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.full,
    backgroundColor: colors.brand.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  closeChipPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  closeChipTxt: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.inverse,
  },
});