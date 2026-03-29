import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueries } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { MOODS, type MoodType } from '../constants/moods';
import { searchSongs } from '../api/jiosaavn';
import type { JioSaavnSong } from '../api/jiosaavn';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { SongRow } from '../components/cards/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, fontSize, spacing } from '../theme';

export function MoodScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { mood } = route.params as { mood: MoodType };
  const meta = MOODS[mood];
  const { playQueue } = usePlayer();
  const user = useAuthStore((s) => s.user);
  const { isLiked, toggleLike } = useLikedSongs();

  const results = useQueries({
    queries: meta.searches.map((q) => ({
      queryKey: ['mood', mood, q],
      queryFn: () => searchSongs(q, 0, 10),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const map = new Map<string, JioSaavnSong>();
  for (const r of results) {
    const songs = r.data ?? [];
    for (const s of songs) {
      if (!map.has(s.id)) map.set(s.id, s);
    }
  }
  const list = [...map.values()];

  return (
    <ScreenWrapper>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
      </Pressable>
      <Text style={[styles.h, { color: meta.color }]}>{meta.label}</Text>
      <Text style={styles.ta}>{meta.labelTamil}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {list.map((s) => (
          <SongRow
            key={s.id}
            song={s}
            onPress={() => void playQueue([s], 0)}
            liked={isLiked(s.id)}
            onToggleLike={() => user && void toggleLike(s.id, isLiked(s.id))}
            showLike={!!user}
          />
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing[2], alignSelf: 'flex-start' },
  h: { fontFamily: fonts.bold, fontSize: fontSize['2xl'] },
  ta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
});
