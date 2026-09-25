import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getLyrics } from '../api/jiosaavn';
import { queryKeys } from '../hooks/queryKeys';
import { LyricsSheetSkeleton } from '../components/ui/PageSkeletons';
import { colors, fonts, fontSize, spacing, layout } from '../theme';

export function LyricsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { songId } = route.params as { songId: string };

  const q = useQuery({
    queryKey: queryKeys.lyrics(songId),
    queryFn: () => getLyrics(songId),
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Pressable style={styles.close} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </Pressable>
        {q.isLoading ? (
          <LyricsSheetSkeleton />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.lyrics}>{q.data?.trim() || 'No lyrics available.'}</Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '85%',
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing[4],
  },
  close: { alignSelf: 'flex-end', marginRight: layout.screenPadding },
  scroll: { padding: layout.screenPadding, paddingBottom: 48 },
  lyrics: {
    fontFamily: fonts.light,
    fontSize: fontSize.base,
    color: colors.text.primary,
    lineHeight: 28,
  },
});
