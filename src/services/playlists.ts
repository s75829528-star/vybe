import { supabase } from '@/lib/supabase';
import type {
  Playlist,
  PlaylistSongWithSong,
  PlaylistWithOwner,
  SongWithRelations,
} from '@/types/database';

const SONG_SELECT = '*, artist:artists(id,name), album:albums(id,title,cover_url)';
const PLAYLIST_SELECT =
  '*, owner:profiles!playlists_owner_id_fkey(id,display_name,avatar_url)';

export async function fetchPlaylistById(id: string): Promise<PlaylistWithOwner> {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('This playlist no longer exists.');
  return data as unknown as PlaylistWithOwner;
}

export async function fetchPlaylistSongs(
  playlistId: string,
  limit: number,
  offset: number,
): Promise<PlaylistSongWithSong[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select(`position, added_at, song:songs!inner(${SONG_SELECT})`)
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as PlaylistSongWithSong[]).filter((row) => Boolean(row.song));
}

export async function fetchPlaylistSongIds(playlistId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('song_id')
    .eq('playlist_id', playlistId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.song_id);
}

export async function fetchOwnedPlaylists(
  userId: string,
  limit: number,
  offset: number,
): Promise<PlaylistWithOwner[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PlaylistWithOwner[];
}

export type CreatePlaylistInput = {
  title: string;
  description?: string | null;
  isPublic: boolean;
  coverUrl?: string | null;
  coverPublicId?: string | null;
};

export async function createPlaylist(
  ownerId: string,
  input: CreatePlaylistInput,
): Promise<Playlist> {
  const title = input.title.trim();
  if (title.length < 1) throw new Error('Give your playlist a name.');
  if (title.length > 120) throw new Error('Playlist names must be 120 characters or fewer.');

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      owner_id: ownerId,
      title,
      description: input.description?.trim() || null,
      is_public: input.isPublic,
      cover_url: input.coverUrl ?? null,
      cover_public_id: input.coverPublicId ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePlaylist(
  playlistId: string,
  input: Pick<CreatePlaylistInput, 'title' | 'description' | 'isPublic'>,
): Promise<Playlist> {
  const title = input.title.trim();
  if (title.length < 1) throw new Error('Give your playlist a name.');
  if (title.length > 120) throw new Error('Playlist names must be 120 characters or fewer.');

  const { data, error } = await supabase
    .from('playlists')
    .update({
      title,
      description: input.description?.trim() || null,
      is_public: input.isPublic,
    })
    .eq('id', playlistId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw new Error(error.message);
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<number> {
  const { data, error } = await supabase.rpc('add_song_to_playlist', {
    p_playlist_id: playlistId,
    p_song_id: songId,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId);
  if (error) throw new Error(error.message);
}

export async function fetchSongsForPicker(
  limit: number,
  offset: number,
  excludedIds: string[],
): Promise<SongWithRelations[]> {
  let query = supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SongWithRelations[];
}
