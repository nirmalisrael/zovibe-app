import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { likeSong, unlikeSong, parseJsonArray, type MockAPIUser } from '../api/mockapi';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from './queryKeys';

export function useLikedSongs() {
  const userId = useAuthStore((s) => s.userId);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const qc = useQueryClient();

  const likedIds = user ? parseJsonArray<string>(user.likedSongs, []) : [];

  const likeMutation = useMutation({
    mutationFn: async (songId: string) => {
      if (!userId || !user) throw new Error('Login required');
      return likeSong(userId, songId, likedIds);
    },
    onMutate: async (songId: string) => {
      if (!userId || !user) return;
      await qc.cancelQueries({ queryKey: queryKeys.user(userId) });
      const prev = user;
      const nextLiked = [...new Set([...likedIds, songId])];
      refreshUser({ ...user, likedSongs: JSON.stringify(nextLiked) });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) refreshUser(ctx.prev);
    },
    onSuccess: (updated: MockAPIUser) => {
      refreshUser(updated);
      qc.invalidateQueries({ queryKey: queryKeys.user(userId ?? '') });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async (songId: string) => {
      if (!userId || !user) throw new Error('Login required');
      return unlikeSong(userId, songId, likedIds);
    },
    onMutate: async (songId: string) => {
      if (!userId || !user) return;
      const prev = user;
      const nextLiked = likedIds.filter((id) => id !== songId);
      refreshUser({ ...user, likedSongs: JSON.stringify(nextLiked) });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) refreshUser(ctx.prev);
    },
    onSuccess: (updated: MockAPIUser) => {
      refreshUser(updated);
      qc.invalidateQueries({ queryKey: queryKeys.user(userId ?? '') });
    },
  });

  const toggleLike = useCallback(
    (songId: string, isLiked: boolean) => {
      if (!userId) return false;
      if (isLiked) unlikeMutation.mutate(songId);
      else likeMutation.mutate(songId);
      return true;
    },
    [userId, likeMutation, unlikeMutation]
  );

  const isLiked = useCallback((songId: string) => likedIds.includes(songId), [likedIds]);

  return {
    likedIds,
    isLiked,
    toggleLike,
    isPending: likeMutation.isPending || unlikeMutation.isPending,
  };
}
