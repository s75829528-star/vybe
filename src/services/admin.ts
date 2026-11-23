import { buildLikePattern, sanitizeSearchTerm } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import type { Album, AlbumWithArtist, Artist, SongWithRelations } from '@/types/database';

const SONG_SELECT = '*, artist:artists(id,name), album:albums(id,title,cover_url)';

export type AdminStats = {
  songs: number;
  published: number;
  drafts: number;
  artists: number;
  albums: number;
  playlists: number;
};

export type SongUpsertInput = {
  title: string;
  artist_id: string;
  album_id: string | null;
  track_number: number | null;
  genre: string;
  language: string;
  duration_seconds: number | null;
  audio_url: string;
  audio_public_id: string;
  cover_url: string | null;
  cover_public_id: string | null;
  is_published: boolean;
};

function exactIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function firstError(error: { message: string } | null): never {
  throw new Error(error?.message || 'The request failed.');
}

export async function fetchAdminSongs(
  search: string,
  limit: number,
  offset: number,
): Promise<SongWithRelations[]> {
  const term = sanitizeSearchTerm(search);
  let query = supabase
    .from('songs')
    .select(SONG_SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (term) {
    query = query.ilike('title', buildLikePattern(term));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SongWithRelations[];
}

export async function fetchAdminSongById(id: string): Promise<SongWithRelations> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('This song no longer exists.');
  return data as unknown as SongWithRelations;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const [songs, published, drafts, artists, albums, playlists] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }),
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('is_published', false),
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase.from('albums').select('id', { count: 'exact', head: true }),
    supabase.from('playlists').select('id', { count: 'exact', head: true }),
  ]);

  for (const result of [songs, published, drafts, artists, albums, playlists]) {
    if (result.error) firstError(result.error);
  }

  return {
    songs: songs.count ?? 0,
    published: published.count ?? 0,
    drafts: drafts.count ?? 0,
    artists: artists.count ?? 0,
    albums: albums.count ?? 0,
    playlists: playlists.count ?? 0,
  };
}

export async function findArtistSuggestions(term: string): Promise<Artist[]> {
  const cleaned = sanitizeSearchTerm(term);
  let query = supabase.from('artists').select('*').order('name').limit(8);
  if (cleaned) {
    query = query.ilike('name', buildLikePattern(cleaned));
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findAlbumSuggestions(
  artistId: string | null,
  term: string,
): Promise<Album[]> {
  if (!artistId) return [];
  const cleaned = sanitizeSearchTerm(term);
  let query = supabase
    .from('albums')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(8);
  if (cleaned) {
    query = query.ilike('title', buildLikePattern(cleaned));
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findOrCreateArtist(name: string): Promise<Artist> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Artist name is required.');

  const { data: existing, error: existingError } = await supabase
    .from('artists')
    .select('*')
    .ilike('name', exactIlike(trimmed))
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('artists')
    .insert({ name: trimmed })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: raced, error: raceError } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', exactIlike(trimmed))
        .limit(1)
        .maybeSingle();
      if (!raceError && raced) return raced;
    }
    throw new Error(error.message);
  }
  return data;
}

export async function findOrCreateAlbum(
  title: string,
  artistId: string,
  coverUrl: string | null,
  coverPublicId: string | null,
): Promise<Album | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const { data: existing, error: existingError } = await supabase
    .from('albums')
    .select('*')
    .eq('artist_id', artistId)
    .ilike('title', exactIlike(trimmed))
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    if (!existing.cover_url && coverUrl) {
      const { data: updated, error: updateError } = await supabase
        .from('albums')
        .update({ cover_url: coverUrl, cover_public_id: coverPublicId })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (!updateError && updated) return updated;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('albums')
    .insert({
      title: trimmed,
      artist_id: artistId,
      cover_url: coverUrl,
      cover_public_id: coverPublicId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: raced, error: raceError } = await supabase
        .from('albums')
        .select('*')
        .eq('artist_id', artistId)
        .ilike('title', exactIlike(trimmed))
        .limit(1)
        .maybeSingle();
      if (!raceError && raced) return raced;
    }
    throw new Error(error.message);
  }
  return data;
}

export async function createSong(input: SongUpsertInput): Promise<SongWithRelations> {
  const { data, error } = await supabase
    .from('songs')
    .insert({
      ...input,
      published_at: input.is_published ? new Date().toISOString() : null,
    })
    .select(SONG_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as SongWithRelations;
}

export type SongUpdateInput = Partial<SongUpsertInput> & {
  is_published?: boolean;
  published_at?: string | null;
};

export async function updateSong(
  id: string,
  input: SongUpdateInput,
): Promise<SongWithRelations> {
  const payload: SongUpdateInput = { ...input };
  if (typeof input.is_published === 'boolean') {
    payload.published_at = input.is_published ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('songs')
    .update(payload)
    .eq('id', id)
    .select(SONG_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as SongWithRelations;
}

export async function setSongPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .update({
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function fetchAdminAlbumOptions(artistId: string): Promise<AlbumWithArtist[]> {
  const { data, error } = await supabase
    .from('albums')
    .select('*, artist:artists(id,name)')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AlbumWithArtist[];
}
