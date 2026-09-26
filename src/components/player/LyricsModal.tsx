import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { JioSaavnSong } from '../../api/jiosaavn';
import { CoverImage } from '../ui/CoverImage';
import { fetchSongLyrics, isTamilText, tamilToEnglishTransliterate } from '../../utils/lyricsHelper';
import { cleanHtmlEntities, getPrimaryArtistNames } from '../../utils/songHelpers';
import { colors, fonts, fontSize, spacing, borderRadius, layout } from '../../theme';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  currentSong: JioSaavnSong | null;
}>;

type LyricsMode = 'tamil' | 'english' | 'dual';

export const LyricsModal = memo(function LyricsModal({
  visible,
  onClose,
  currentSong,
}: Props) {
  const insets = useSafeAreaInsets();
  const [lyricsMode, setLyricsMode] = useState<LyricsMode>('tamil');
  const [loading, setLoading] = useState(false);
  const [rawLyrics, setRawLyrics] = useState<string>('');

  const panY = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      panY.setValue(0);
    }
  }, [visible, panY]);

  // Load lyrics when modal opens or current song changes
  useEffect(() => {
    if (!visible || !currentSong) return;

    let active = true;
    setLoading(true);
    setRawLyrics('');

    void (async () => {
      try {
        const text = await fetchSongLyrics(currentSong);
        if (active) {
          setRawLyrics(text);
          // If lyrics have Tamil script, default to Tamil or Dual
          if (isTamilText(text)) {
            setLyricsMode('tamil');
          } else {
            setLyricsMode('english');
          }
        }
      } catch {
        if (active) setRawLyrics('');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [visible, currentSong?.id]);

  const hasTamil = useMemo(() => isTamilText(rawLyrics), [rawLyrics]);

  // Prepared lyrics representations
  const parsedLines = useMemo(() => {
    if (!rawLyrics.trim()) return [];
    return rawLyrics
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [rawLyrics]);

  const englishLyricsText = useMemo(() => {
    if (!rawLyrics.trim()) return '';
    if (!hasTamil) return rawLyrics;
    return tamilToEnglishTransliterate(rawLyrics);
  }, [rawLyrics, hasTamil]);

  const dualLines = useMemo(() => {
    if (!hasTamil) return [];
    return parsedLines.map((line) => {
      return {
        tamil: line,
        english: tamilToEnglishTransliterate(line),
      };
    });
  }, [parsedLines, hasTamil]);

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

  const coverUrl =
    currentSong?.image?.find((i) => i.quality === '500x500')?.url ??
    currentSong?.image?.[0]?.url;

  const artistName = currentSong ? getPrimaryArtistNames(currentSong) : '';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Tap outside sheet to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss lyrics modal"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing[4]),
              transform: [{ translateY: panY }],
            },
          ]}
        >
          {/* ── Drag bar handle for swipe-down dismiss ── */}
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={styles.dragBar} />
          </View>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerSongMeta}>
              {coverUrl ? (
                <CoverImage
                  uri={coverUrl}
                  size={44}
                  radius={borderRadius.md}
                />
              ) : null}
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {cleanHtmlEntities(currentSong?.name || 'Lyrics')}
                </Text>
                <Text style={styles.headerArtist} numberOfLines={1}>
                  {artistName || 'Song Lyrics'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close lyrics"
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* ── Language Switcher Tabs ── */}
          {hasTamil ? (
            <View style={styles.tabBar}>
              <Pressable
                onPress={() => setLyricsMode('tamil')}
                style={[styles.tabItem, lyricsMode === 'tamil' && styles.tabItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: lyricsMode === 'tamil' }}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    lyricsMode === 'tamil' && styles.tabItemTextActive,
                  ]}
                >
                  தமிழ் (Tamil)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLyricsMode('english')}
                style={[styles.tabItem, lyricsMode === 'english' && styles.tabItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: lyricsMode === 'english' }}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    lyricsMode === 'english' && styles.tabItemTextActive,
                  ]}
                >
                  English (Roman)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLyricsMode('dual')}
                style={[styles.tabItem, lyricsMode === 'dual' && styles.tabItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: lyricsMode === 'dual' }}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    lyricsMode === 'dual' && styles.tabItemTextActive,
                  ]}
                >
                  Both (Dual)
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.singleLangBadge}>
              <Ionicons name="musical-notes-outline" size={14} color={colors.brand.light} />
              <Text style={styles.singleLangText}>Original Lyrics</Text>
            </View>
          )}

          {/* ── Content Body ── */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text style={styles.loadingText}>Fetching lyrics...</Text>
            </View>
          ) : !rawLyrics.trim() ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Lyrics Found</Text>
              <Text style={styles.emptySubtitle}>
                Lyrics aren't available for this track right now.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {lyricsMode === 'dual' && hasTamil ? (
                dualLines.map((item, idx) => (
                  <View key={`dual-${idx}`} style={styles.dualLineBlock}>
                    <Text style={styles.tamilLineText}>{item.tamil}</Text>
                    <Text style={styles.romanLineText}>{item.english}</Text>
                  </View>
                ))
              ) : lyricsMode === 'english' ? (
                <Text style={styles.lyricsText}>{englishLyricsText}</Text>
              ) : (
                <Text style={styles.lyricsText}>{rawLyrics}</Text>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    minHeight: '55%',
    backgroundColor: '#16161D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.24)',
    borderBottomWidth: 0,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  dragHandleContainer: {
    width: '100%',
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragBar: {
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerSongMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginRight: spacing[3],
  },
  headerCover: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  headerArtist: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: layout.screenPadding,
    marginTop: spacing[3],
    marginBottom: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  tabItemActive: {
    backgroundColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  tabItemText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  tabItemTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  singleLangBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[2],
  },
  singleLangText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding + 4,
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
  },
  lyricsText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 34,
    letterSpacing: 0.3,
  },
  dualLineBlock: {
    marginBottom: spacing[3],
  },
  tamilLineText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 28,
  },
  romanLineText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.brand.light,
    lineHeight: 22,
    marginTop: 2,
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.base,
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
