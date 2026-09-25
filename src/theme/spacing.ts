import { Dimensions } from "react-native";

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const layout = {
  screenPadding: 16,
  cardPadding: 12,
  sectionGap: 24,
  miniPlayerHeight: 64,
  tabBarHeight: 80,
  screenWidth: Dimensions.get('window').width,
};
