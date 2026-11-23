import { supabase } from '@/lib/supabase';
import type {
  FollowedArtistRow,
  LikedSongRow,
  SavedAlbumRow,
} from '@/types/database';

const SONG_SELECT = '*, artist:artists(id,name), album:albums(id,title,cover_url)';

export async function fetchLikedSongs(
  limit: number,
  offset: number,
): Promise<LikedSongRow[]> {
  const { data, error } = await supabase
    .from('liked_songs')
    .select(`created_at, song:songs!inner(${SONG_SELECT})`)
    .eq('songs.is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LikedSongRow[]).filter((row) => Boolean(row.song));
}

export async function fetchSavedAlbums(
  limit: number,
  offset: number,
): Promise<SavedAlbumRow[]> {
  const { data, error } = await supabase
    .from('saved_albums')
    .select('saved_at, album:albums!inner(*, artist:artists(id,name))')
    .order('saved_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as SavedAlbumRow[]).filter((row) => Boolean(row.album));
}

export async function fetchFollowedArtists(
  limit: number,
  offset: number,
): Promise<FollowedArtistRow[]> {
  const { data, error } = await supabase
    .from('followed_artists')
    .select('followed_at, artist:artists!inner(*)')
    .order('followed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as FollowedArtistRow[]).filter((row) => Boolean(row.artist));
}

export async function fetchLikedCount(): Promise<number> {
  const { count, error } = await supabase
    .from('liked_songs')
    .select('song_id', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}
