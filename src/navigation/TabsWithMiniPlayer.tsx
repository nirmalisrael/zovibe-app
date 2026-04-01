import { View, StyleSheet } from 'react-native';
import { MainNavigator } from './MainNavigator';

/** Tabs + mini player: mini is rendered inside the tab bar (see MainNavigator) for zero gap above the bar. */
export function TabsWithMiniPlayer() {
  return (
    <View style={styles.flex}>
      <MainNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
