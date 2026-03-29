import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainNavigator } from './MainNavigator';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { layout } from '../theme';
import type { MainAppStackParamList } from './types';

export function TabsWithMiniPlayer() {
  const navigation = useNavigation<NativeStackNavigationProp<MainAppStackParamList>>();
  const insets = useSafeAreaInsets();
  const queueLen = usePlayerStore((s) => s.queue.length);
  const bottomOffset = layout.tabBarHeight + insets.bottom;

  return (
    <View style={styles.flex}>
      <MainNavigator />
      {queueLen > 0 ? (
        <View style={[styles.mini, { bottom: bottomOffset }]} pointerEvents="box-none">
          <MiniPlayer onExpand={() => navigation.navigate('NowPlaying')} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mini: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
