-- ===========================================================================
-- VYBE · schema
-- Target: Supabase Postgres 15+
-- Apply with: supabase db push  (or psql -f this file)
-- ===========================================================================

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('listener', 'admin');
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Listener'
    check (char_length(btrim(display_name)) between 1 and 60),
  avatar_url text,
  role public.user_role not null default 'listener',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- artists
-- ---------------------------------------------------------------------------

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  bio text check (bio is null or char_length(bio) <= 2000),
  image_url text,
  image_public_id text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artists_name_unique on public.artists (lower(btrim(name)));

drop trigger if exists artists_set_updated_at on public.artists;
create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- albums
-- ---------------------------------------------------------------------------

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  artist_id uuid references public.artists (id) on delete set null,
  cover_url text,
  cover_public_id text,
  release_year integer check (release_year is null or release_year between 1900 and 2200),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists albums_artist_id_idx on public.albums (artist_id);
create unique index if not exists albums_artist_title_unique
  on public.albums (artist_id, lower(btrim(title)))
  where artist_id is not null;

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
  before update on public.albums
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  artist_id uuid not null references public.artists (id) on delete restrict,
  album_id uuid references public.albums (id) on delete set null,
  track_number integer check (track_number is null or track_number between 1 and 999),
  genre text not null check (char_length(btrim(genre)) between 1 and 60),
  language text not null check (char_length(btrim(language)) between 1 and 60),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  audio_url text not null check (audio_url like 'https://%'),
  audio_public_id text not null check (char_length(audio_public_id) > 0),
  cover_url text,
  cover_public_id text,
  is_published boolean not null default false,
  published_at timestamptz,
  play_count bigint not null default 0 check (play_count >= 0),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_published_recent_idx
  on public.songs (published_at desc nulls last, created_at desc)
  where is_published;
create index if not exists songs_artist_id_idx on public.songs (artist_id);
create index if not exists songs_album_id_idx on public.songs (album_id);
create index if not exists songs_genre_idx on public.songs (genre) where is_published;
create index if not exists songs_language_idx on public.songs (language) where is_published;
create index if not exists songs_play_count_idx on public.songs (play_count desc) where is_published;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- playlists
-- ---------------------------------------------------------------------------

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 400),
  cover_url text,
  cover_public_id text,
  owner_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlists_owner_id_idx on public.playlists (owner_id);
create index if not exists playlists_public_idx on public.playlists (updated_at desc) where is_public;

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- playlist_songs
-- ---------------------------------------------------------------------------

create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  added_at timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

create index if not exists playlist_songs_order_idx
  on public.playlist_songs (playlist_id, position, added_at);
create index if not exists playlist_songs_song_idx on public.playlist_songs (song_id);

-- ---------------------------------------------------------------------------
-- listener libraries
-- ---------------------------------------------------------------------------

create table if not exists public.liked_songs (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index if not exists liked_songs_user_created_idx
  on public.liked_songs (user_id, created_at desc);

create table if not exists public.recently_played (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  played_at timestamptz not null default now(),
  play_count integer not null default 1 check (play_count > 0),
  primary key (user_id, song_id)
);

create index if not exists recently_played_user_time_idx
  on public.recently_played (user_id, played_at desc);

create table if not exists public.saved_albums (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, album_id)
);

create index if not exists saved_albums_user_time_idx
  on public.saved_albums (user_id, saved_at desc);

create table if not exists public.followed_artists (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create index if not exists followed_artists_user_time_idx
  on public.followed_artists (user_id, followed_at desc);

-- ---------------------------------------------------------------------------
-- New auth user → profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_name text;
begin
  fallback_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Listener'
  );

  insert into public.profiles (id, display_name, role)
  values (new.id, left(fallback_name, 60), 'listener')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
