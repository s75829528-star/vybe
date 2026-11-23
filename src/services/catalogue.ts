import type { PostgrestError } from '@supabase/supabase-js';

import { HOME_SECTION_LIMIT } from '@/lib/constants';
import { buildLikePattern, hasSearchTerm, sanitizeSearchTerm } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import type {
  Album,
  AlbumWithArtist,
  Artist,
  PlaylistWithOwner,
  RecentlyPlayedRow,
  SongWithRelations,
} from '@/types/database';

const SONG_SELECT = '*, artist:artists(id,name), album:albums(id,title,cover_url)';
const SONG_NESTED_SELECT = `song:songs!inner(${SONG_SELECT})`;
const PLAYLIST_SELECT =
  '*, owner:profiles!playlists_owner_id_fkey(id,display_name,avatar_url)';
const ALBUM_SELECT = '*, artist:artists(id,name)';

export type SongSort = 'recent' | 'title' | 'plays' | 'track';

export type SongPageOptions = {
  limit: number;
  offset: number;
  language?: string | null;
  genre?: string | null;
  albumId?: string | null;
  artistId?: string | null;
  sort?: SongSort;
};

function throwIfError(error: PostgrestError | null, fallback: string): void {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

export async function fetchSongs(options: SongPageOptions): Promise<SongWithRelations[]> {
  let query = supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('is_published', true)
    .range(options.offset, options.offset + options.limit - 1);

  if (options.language) query = query.eq('language', options.language);
  if (options.genre) query = query.eq('genre', options.genre);
  if (options.albumId) query = query.eq('album_id', options.albumId);
  if (options.artistId) query = query.eq('artist_id', options.artistId);

  if (options.sort === 'title') {
    query = query.order('title', { ascending: true });
  } else if (options.sort === 'track') {
    query = query
      .order('track_number', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true });
  } else if (options.sort === 'plays') {
    query = query.order('play_count', { ascending: false }).order('published_at', { ascending: false });
  } else {
    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  throwIfError(error, 'Songs could not be loaded.');
  return (data ?? []) as unknown as SongWithRelations[];
}

export async function fetchRecentlyPlayed(limit = HOME_SECTION_LIMIT): Promise<RecentlyPlayedRow[]> {
  const { data, error } = await supabase
    .from('recently_played')
    .select(`played_at, play_count, ${SONG_NESTED_SELECT}`)
    .eq('songs.is_published', true)
    .order('played_at', { ascending: false })
    .limit(limit);

  throwIfError(error, 'Recently played could not be loaded.');
  return (data ?? [])
    .map((row) => row as unknown as RecentlyPlayedRow)
    .filter((row) => Boolean(row.song));
}

export async function fetchRecentlyAdded(limit = HOME_SECTION_LIMIT): Promise<SongWithRelations[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  throwIfError(error, 'New releases could not be loaded.');
  return (data ?? []) as unknown as SongWithRelations[];
}

export async function fetchTamilSongs(limit = HOME_SECTION_LIMIT): Promise<SongWithRelations[]> {
  return fetchSongs({ limit, offset: 0, language: 'Tamil', sort: 'recent' });
}

export async function fetchAlbums(limit = HOME_SECTION_LIMIT): Promise<AlbumWithArtist[]> {
  const { data, error } = await supabase
    .from('albums')
    .select(ALBUM_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfError(error, 'Albums could not be loaded.');
  return (data ?? []) as unknown as AlbumWithArtist[];
}

export async function fetchPublicPlaylists(
  limit = HOME_SECTION_LIMIT,
): Promise<PlaylistWithOwner[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  throwIfError(error, 'Playlists could not be loaded.');
  return (data ?? []) as unknown as PlaylistWithOwner[];
}

export async function fetchAlbumById(id: string): Promise<AlbumWithArtist> {
  const { data, error } = await supabase
    .from('albums')
    .select(ALBUM_SELECT)
    .eq('id', id)
    .maybeSingle();

  throwIfError(error, 'Album could not be loaded.');
  if (!data) throw new Error('This album no longer exists.');
  return data as unknown as AlbumWithArtist;
}

export async function fetchArtistById(id: string): Promise<Artist> {
  const { data, error } = await supabase.from('artists').select('*').eq('id', id).maybeSingle();

  throwIfError(error, 'Artist could not be loaded.');
  if (!data) throw new Error('This artist no longer exists.');
  return data;
}

export async function fetchArtistAlbums(
  artistId: string,
  limit: number,
  offset: number,
): Promise<AlbumWithArtist[]> {
  const { data, error } = await supabase
    .from('albums')
    .select(ALBUM_SELECT)
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  throwIfError(error, 'Artist albums could not be loaded.');
  return (data ?? []) as unknown as AlbumWithArtist[];
}

export async function fetchSongById(id: string): Promise<SongWithRelations> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  throwIfError(error, 'Song could not be loaded.');
  if (!data) throw new Error('This song is no longer available.');
  return data as unknown as SongWithRelations;
}

async function matchingArtistIds(search: string): Promise<string[]> {
  if (!hasSearchTerm(search)) return [];
  const { data, error } = await supabase
    .from('artists')
    .select('id')
    .ilike('name', buildLikePattern(search))
    .limit(40);

  if (error) return [];
  return (data ?? []).map((row) => row.id);
}

export type SearchOptions = {
  query: string;
  limit: number;
  offset: number;
  genre?: string | null;
  language?: string | null;
};

export async function searchSongs(options: SearchOptions): Promise<SongWithRelations[]> {
  const term = sanitizeSearchTerm(options.query);
  let query = supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('is_published', true)
    .range(options.offset, options.offset + options.limit - 1);

  if (term) {
    const artistIds = await matchingArtistIds(term);
    const like = buildLikePattern(term);
    const filters = [`title.ilike.${like}`];
    if (artistIds.length > 0) {
      filters.push(`artist_id.in.(${artistIds.join(',')})`);
    }
    query = query.or(filters.join(','));
  }

  if (options.genre) query = query.eq('genre', options.genre);
  if (options.language) query = query.eq('language', options.language);

  query = query
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('title', { ascending: true });

  const { data, error } = await query;
  throwIfError(error, 'Search results could not be loaded.');
  return (data ?? []) as unknown as SongWithRelations[];
}

export async function searchArtists(
  query: string,
  limit: number,
  offset: number,
): Promise<Artist[]> {
  const term = sanitizeSearchTerm(query);
  let request = supabase
    .from('artists')
    .select('*')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (term) {
    request = request.ilike('name', buildLikePattern(term));
  }

  const { data, error } = await request;
  throwIfError(error, 'Artists could not be loaded.');
  return data ?? [];
}

export async function searchAlbums(
  query: string,
  limit: number,
  offset: number,
): Promise<AlbumWithArtist[]> {
  const term = sanitizeSearchTerm(query);
  let request = supabase
    .from('albums')
    .select(ALBUM_SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (term) {
    const artistIds = await matchingArtistIds(term);
    const filters = [`title.ilike.${buildLikePattern(term)}`];
    if (artistIds.length > 0) filters.push(`artist_id.in.(${artistIds.join(',')})`);
    request = request.or(filters.join(','));
  }

  const { data, error } = await request;
  throwIfError(error, 'Albums could not be loaded.');
  return (data ?? []) as unknown as AlbumWithArtist[];
}

export async function searchPlaylists(
  query: string,
  limit: number,
  offset: number,
): Promise<PlaylistWithOwner[]> {
  const term = sanitizeSearchTerm(query);
  let request = supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (term) {
    request = request.ilike('title', buildLikePattern(term));
  }

  const { data, error } = await request;
  throwIfError(error, 'Playlists could not be loaded.');
  return (data ?? []) as unknown as PlaylistWithOwner[];
}

export type HomeFeed = {
  recentlyPlayed: RecentlyPlayedRow[];
  recentlyAdded: SongWithRelations[];
  albums: AlbumWithArtist[];
  playlists: PlaylistWithOwner[];
  tamil: SongWithRelations[];
};

export async function fetchHomeFeed(): Promise<HomeFeed> {
  const [recentlyPlayed, recentlyAdded, albums, playlists, tamil] = await Promise.all([
    fetchRecentlyPlayed(),
    fetchRecentlyAdded(),
    fetchAlbums(),
    fetchPublicPlaylists(),
    fetchTamilSongs(),
  ]);

  return { recentlyPlayed, recentlyAdded, albums, playlists, tamil };
}

export async function fetchAllGenres(): Promise<string[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('genre')
    .eq('is_published', true)
    .limit(500);

  if (error) return [];
  const unique = new Set<string>();
  for (const row of data ?? []) {
    if (row.genre) unique.add(row.genre);
  }
  return [...unique].sort();
}

export type { Album, Artist };
