import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSleepTimerStore, type SleepTimerOption } from '../../store/sleepTimerStore';
import { colors, fonts, fontSize, spacing, borderRadius } from '../../theme';
import { formatTime } from '../../utils/formatTime';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
}>;

const OPTIONS: Array<{ label: string; value: SleepTimerOption; icon: string }> = [
  { label: '5 minutes', value: 5, icon: 'time-outline' },
  { label: '10 minutes', value: 10, icon: 'time-outline' },
  { label: '15 minutes', value: 15, icon: 'time-outline' },
  { label: '30 minutes', value: 30, icon: 'time-outline' },
  { label: '45 minutes', value: 45, icon: 'time-outline' },
  { label: '60 minutes (1 hour)', value: 60, icon: 'time-outline' },
  { label: 'End of this track', value: 'end_of_track', icon: 'musical-note-outline' },
];

export const SleepTimerModal = memo(function SleepTimerModal({
  visible,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const isActive = useSleepTimerStore((s) => s.isActive);
  const mode = useSleepTimerStore((s) => s.mode);
  const remainingSeconds = useSleepTimerStore((s) => s.remainingSeconds);
  const selectedMinutes = useSleepTimerStore((s) => s.selectedMinutes);
  const setTimerMinutes = useSleepTimerStore((s) => s.setTimerMinutes);
  const setTimerEndOfTrack = useSleepTimerStore((s) => s.setTimerEndOfTrack);
  const clearTimer = useSleepTimerStore((s) => s.clearTimer);

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

  const handleSelectOption = useCallback(
    (option: SleepTimerOption) => {
      if (option === 'end_of_track') {
        setTimerEndOfTrack();
      } else {
        setTimerMinutes(option);
      }
      handleClose();
    },
    [setTimerMinutes, setTimerEndOfTrack, handleClose]
  );

  const handleTurnOff = useCallback(() => {
    clearTimer();
    handleClose();
  }, [clearTimer, handleClose]);

  const remainingLabel =
    mode === 'end_of_track'
      ? 'At end of this song'
      : remainingSeconds != null
      ? formatTime(remainingSeconds)
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, spacing[4]) + spacing[2],
            transform: [{ translateY: panY }],
          },
        ]}
      >
        {/* Drag header with swipe down gesture */}
        <View {...panResponder.panHandlers} style={styles.dragHeader}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="moon" size={18} color={colors.brand.light} />
              </View>
              <View>
                <Text style={styles.title}>Sleep Timer</Text>
                <Text style={styles.subtitle}>Automatically stop music</Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close sleep timer"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Active Timer Banner */}
        {isActive ? (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerInfo}>
              <View style={styles.activePulseDot} />
              <View>
                <Text style={styles.activeLabel}>Timer is running</Text>
                <Text style={styles.activeCountdown}>
                  Stops in: <Text style={styles.countdownValue}>{remainingLabel}</Text>
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleTurnOff}
              style={({ pressed }) => [styles.turnOffBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Turn off sleep timer"
            >
              <Text style={styles.turnOffText}>Turn Off</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Options List */}
        <ScrollView
          style={styles.optionsList}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScrollEndDrag={(e) => {
            if (e.nativeEvent.contentOffset.y < -35) {
              handleClose();
            }
          }}
        >
          {OPTIONS.map((item) => {
            const isSelected =
              isActive &&
              ((item.value === 'end_of_track' && mode === 'end_of_track') ||
                (typeof item.value === 'number' &&
                  mode === 'minutes' &&
                  selectedMinutes === item.value));

            return (
              <Pressable
                key={String(item.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  isSelected && styles.optionRowSelected,
                  pressed && styles.optionRowPressed,
                ]}
                onPress={() => handleSelectOption(item.value)}
                accessibilityRole="button"
                accessibilityLabel={`Set sleep timer for ${item.label}`}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIconWrap, isSelected && styles.optionIconWrapSelected]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isSelected ? colors.brand.light : colors.text.tertiary}
                    />
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {item.label}
                  </Text>
                </View>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.brand.light} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.72)',
  },
  sheet: {
    backgroundColor: 'rgba(22, 22, 28, 0.96)',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    paddingTop: spacing[3],
    paddingHorizontal: spacing[4],
    maxHeight: '78%',
  },
  dragHeader: {
    width: '100%',
    paddingBottom: spacing[1],
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3] + 2,
    marginBottom: spacing[3],
  },
  activeBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  activePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.light,
  },
  activeLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.brand.light,
  },
  activeCountdown: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: 1,
  },
  countdownValue: {
    fontFamily: fonts.bold,
    color: colors.text.primary,
  },
  turnOffBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.38)',
  },
  turnOffText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: '#F87171',
  },
  btnPressed: {
    opacity: 0.75,
  },
  optionsList: {
    marginBottom: spacing[2],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3] + 1,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionRowSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderColor: 'rgba(139, 92, 246, 0.45)',
  },
  optionRowPressed: {
    opacity: 0.8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  optionLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    fontFamily: fonts.bold,
    color: colors.text.primary,
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
});
