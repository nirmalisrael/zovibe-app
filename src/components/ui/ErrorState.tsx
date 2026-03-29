import { View, StyleSheet } from 'react-native';
import { ZText } from './ZText';
import { ZButton } from './ZButton';
import { spacing } from '../../theme';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <ZText variant="subtitle" style={styles.msg}>
        {message}
      </ZText>
      {onRetry ? <ZButton title="Retry" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[4],
  },
  msg: { textAlign: 'center' },
});
