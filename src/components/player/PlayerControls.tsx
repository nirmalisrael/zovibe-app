import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import type { RepeatMode } from '../../store/playerStore';

export function PlayerControls({
  isPlaying,
  shuffle,
  repeat,
  onPrev,
  onNext,
  onTogglePlay,
  onShuffle,
  onRepeat,
}: {
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onShuffle} hitSlop={8}>
        <Ionicons
          name="shuffle"
          size={22}
          color={shuffle ? colors.brand.light : colors.text.tertiary}
        />
      </Pressable>
      <Pressable onPress={onPrev} hitSlop={8}>
        <Ionicons name="play-skip-back" size={28} color={colors.text.primary} />
      </Pressable>
      <Pressable style={styles.play} onPress={onTogglePlay}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={32}
          color={colors.text.inverse}
        />
      </Pressable>
      <Pressable onPress={onNext} hitSlop={8}>
        <Ionicons name="play-skip-forward" size={28} color={colors.text.primary} />
      </Pressable>
      <Pressable onPress={onRepeat} hitSlop={8}>
        <Ionicons
          name="repeat"
          size={22}
          color={repeat !== 'off' ? colors.brand.light : colors.text.tertiary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginVertical: spacing[4],
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
