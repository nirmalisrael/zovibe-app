import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors } from '../theme';

/** Shared stack motion: horizontal push + swipe-back; single bg to avoid flash between screens */
export const defaultNativeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  gestureDirection: 'horizontal',
  contentStyle: { backgroundColor: colors.bg.primary },
};
