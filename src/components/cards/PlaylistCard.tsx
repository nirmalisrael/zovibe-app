import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { MockAPIPlaylistRow } from '../../api/mockapi';
import { parseJsonArray } from '../../api/mockapi';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PlaylistCard({
  playlist,
  onPress,
}: {
  playlist: MockAPIPlaylistRow;
  onPress: () => void;
}) {
  const count = parseJsonArray<string>(playlist.songIds, []).length;
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.85]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value * 0.6, { duration: 150 }),
  }));

  return (
    <AnimatedPressable
      style={[styles.row, animatedStyle]}
      onPress={onPress}
      onPressIn={() => { pressed.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 400 }); }}
      accessibilityRole="button"
      accessibilityLabel={`${playlist.name}, ${count} songs`}
    >
      {/* Subtle glow overlay on press */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.glow, glowStyle]} />

      <View style={styles.iconBox}>
        {/* Stacked note visual for depth */}
        <View style={styles.noteStackBack} />
        <View style={styles.noteStackMid} />
        <View style={styles.noteStackFront}>
          <Ionicons name="musical-notes" size={22} color={colors.brand.light} />
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.name}
        </Text>
        <View style={styles.subRow}>
          <View style={styles.dot} />
          <Text style={styles.sub}>
            {count} {count === 1 ? 'song' : 'songs'}
          </Text>
        </View>
      </View>

      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={14} color={colors.brand.light} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.15)',
    overflow: 'hidden',
  },
  glow: {
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  // Stacked icon layers for visual depth
  iconBox: {
    width: 52,
    height: 52,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteStackBack: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.15)',
    transform: [{ rotate: '-6deg' }, { translateX: -2 }],
  },
  noteStackMid: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    transform: [{ rotate: '-2deg' }],
  },
  noteStackFront: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.brand.light,
    opacity: 0.7,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});