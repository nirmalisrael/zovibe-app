import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export function LoadingSpinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size={size} color={colors.brand.light} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: 'center', justifyContent: 'center' },
});
