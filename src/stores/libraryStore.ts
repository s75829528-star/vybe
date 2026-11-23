import { create } from 'zustand';

import { getErrorMessage, logError } from '@/lib/errors';
import { hapticError, hapticLight, hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

type IdMap = Record<string, true>;

type LibraryState = {
  ready: boolean;
  loading: boolean;
  version: number;
  liked: IdMap;
  savedAlbums: IdMap;
  followedArtists: IdMap;
  pending: Record<string, true>;
  load: () => Promise<void>;
  refresh: () => void;
  reset: () => void;
  toggleLike: (songId: string) => Promise<boolean>;
  toggleSaveAlbum: (albumId: string) => Promise<boolean>;
  toggleFollowArtist: (artistId: string) => Promise<boolean>;
};

function addKey(map: IdMap, key: string): IdMap {
  return { ...map, [key]: true };
}

function removeKey(map: IdMap, key: string): IdMap {
  const next = { ...map };
  delete next[key];
  return next;
}

function currentUserId(): string {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) {
    throw new Error('You need to be signed in to do that.');
  }
  return userId;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  ready: false,
  loading: false,
  version: 0,
  liked: {},
  savedAlbums: {},
  followedArtists: {},
  pending: {},

  load: async () => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) {
      get().reset();
      return;
    }

    set({ loading: true });
    try {
      const [likedResult, albumsResult, artistsResult] = await Promise.all([
        supabase.from('liked_songs').select('song_id'),
        supabase.from('saved_albums').select('album_id'),
        supabase.from('followed_artists').select('artist_id'),
      ]);

      if (likedResult.error) throw likedResult.error;
      if (albumsResult.error) throw albumsResult.error;
      if (artistsResult.error) throw artistsResult.error;

      const liked: IdMap = {};
      for (const row of likedResult.data ?? []) liked[row.song_id] = true;
      const savedAlbums: IdMap = {};
      for (const row of albumsResult.data ?? []) savedAlbums[row.album_id] = true;
      const followedArtists: IdMap = {};
      for (const row of artistsResult.data ?? []) followedArtists[row.artist_id] = true;

      set({ liked, savedAlbums, followedArtists, ready: true, loading: false });
    } catch (error) {
      logError('library/load', error);
      set({ ready: true, loading: false });
      useToastStore.getState().show('Your library could not be fully loaded.', 'error');
    }
  },

  refresh: () => set((state) => ({ version: state.version + 1 })),

  reset: () =>
    set({
      ready: false,
      loading: false,
      liked: {},
      savedAlbums: {},
      followedArtists: {},
      pending: {},
      version: 0,
    }),

  toggleLike: async (songId) => {
    const userId = currentUserId();
    if (get().pending[`like:${songId}`]) return Boolean(get().liked[songId]);

    const wasLiked = Boolean(get().liked[songId]);
    hapticLight();
    set((state) => ({
      liked: wasLiked ? removeKey(state.liked, songId) : addKey(state.liked, songId),
      pending: addKey(state.pending, `like:${songId}`),
    }));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('liked_songs')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('liked_songs')
          .upsert({ user_id: userId, song_id: songId }, { onConflict: 'user_id,song_id' });
        if (error) throw error;
      }
      set((state) => ({
        pending: removeKey(state.pending, `like:${songId}`),
        version: state.version + 1,
      }));
      return !wasLiked;
    } catch (error) {
      set((state) => ({
        liked: wasLiked ? addKey(state.liked, songId) : removeKey(state.liked, songId),
        pending: removeKey(state.pending, `like:${songId}`),
      }));
      hapticError();
      logError('library/toggleLike', error);
      useToastStore
        .getState()
        .show(getErrorMessage(error, 'Could not update liked songs.'), 'error');
      throw error;
    }
  },

  toggleSaveAlbum: async (albumId) => {
    const userId = currentUserId();
    if (get().pending[`album:${albumId}`]) return Boolean(get().savedAlbums[albumId]);

    const wasSaved = Boolean(get().savedAlbums[albumId]);
    hapticLight();
    set((state) => ({
      savedAlbums: wasSaved
        ? removeKey(state.savedAlbums, albumId)
        : addKey(state.savedAlbums, albumId),
      pending: addKey(state.pending, `album:${albumId}`),
    }));

    try {
      if (wasSaved) {
        const { error } = await supabase
          .from('saved_albums')
          .delete()
          .eq('user_id', userId)
          .eq('album_id', albumId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_albums')
          .upsert({ user_id: userId, album_id: albumId }, { onConflict: 'user_id,album_id' });
        if (error) throw error;
      }
      set((state) => ({
        pending: removeKey(state.pending, `album:${albumId}`),
        version: state.version + 1,
      }));
      return !wasSaved;
    } catch (error) {
      set((state) => ({
        savedAlbums: wasSaved
          ? addKey(state.savedAlbums, albumId)
          : removeKey(state.savedAlbums, albumId),
        pending: removeKey(state.pending, `album:${albumId}`),
      }));
      hapticError();
      logError('library/toggleSaveAlbum', error);
      useToastStore
        .getState()
        .show(getErrorMessage(error, 'Could not update saved albums.'), 'error');
      throw error;
    }
  },

  toggleFollowArtist: async (artistId) => {
    const userId = currentUserId();
    if (get().pending[`artist:${artistId}`]) return Boolean(get().followedArtists[artistId]);

    const wasFollowing = Boolean(get().followedArtists[artistId]);
    hapticLight();
    set((state) => ({
      followedArtists: wasFollowing
        ? removeKey(state.followedArtists, artistId)
        : addKey(state.followedArtists, artistId),
      pending: addKey(state.pending, `artist:${artistId}`),
    }));

    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from('followed_artists')
          .delete()
          .eq('user_id', userId)
          .eq('artist_id', artistId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('followed_artists')
          .upsert({ user_id: userId, artist_id: artistId }, { onConflict: 'user_id,artist_id' });
        if (error) throw error;
      }
      set((state) => ({
        pending: removeKey(state.pending, `artist:${artistId}`),
        version: state.version + 1,
      }));
      hapticSuccess();
      return !wasFollowing;
    } catch (error) {
      set((state) => ({
        followedArtists: wasFollowing
          ? addKey(state.followedArtists, artistId)
          : removeKey(state.followedArtists, artistId),
        pending: removeKey(state.pending, `artist:${artistId}`),
      }));
      hapticError();
      logError('library/toggleFollowArtist', error);
      useToastStore
        .getState()
        .show(getErrorMessage(error, 'Could not update followed artists.'), 'error');
      throw error;
    }
  },
}));
