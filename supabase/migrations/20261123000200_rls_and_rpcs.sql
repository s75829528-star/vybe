-- ===========================================================================
-- VYBE · permissions, RPCs and row-level security
-- Apply after 20261123000100_schema.sql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Role helper
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Users may edit their own display name/avatar, but never grant themselves
-- the admin role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted SQL (migrations, the dashboard, service-role jobs) has no JWT
  -- subject. Signed-in users may only change a role if they are already an
  -- administrator.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only administrators can change profile roles'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- RPC: record a play
-- ---------------------------------------------------------------------------

create or replace function public.record_song_play(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listener uuid := auth.uid();
begin
  if listener is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.songs
    where id = p_song_id and is_published
  ) then
    raise exception 'This song is not available' using errcode = 'P0002';
  end if;

  insert into public.recently_played (user_id, song_id, played_at, play_count)
  values (listener, p_song_id, now(), 1)
  on conflict (user_id, song_id) do update
    set played_at = now(),
        play_count = public.recently_played.play_count + 1;

  update public.songs
  set play_count = play_count + 1
  where id = p_song_id;
end;
$$;

revoke all on function public.record_song_play(uuid) from public;
grant execute on function public.record_song_play(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: append a song to an owned playlist
-- ---------------------------------------------------------------------------

create or replace function public.add_song_to_playlist(p_playlist_id uuid, p_song_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  listener uuid := auth.uid();
  existing_position integer;
  next_position integer;
  playlist_owner uuid;
begin
  if listener is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select owner_id into playlist_owner
  from public.playlists
  where id = p_playlist_id;

  if playlist_owner is null then
    raise exception 'Playlist not found' using errcode = 'P0002';
  end if;

  if playlist_owner <> listener and not public.is_admin() then
    raise exception 'You do not own this playlist' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.songs
    where id = p_song_id and (is_published or public.is_admin())
  ) then
    raise exception 'This song is not available' using errcode = 'P0002';
  end if;

  select position into existing_position
  from public.playlist_songs
  where playlist_id = p_playlist_id and song_id = p_song_id;

  if existing_position is not null then
    return existing_position;
  end if;

  select coalesce(max(position), 0) + 1 into next_position
  from public.playlist_songs
  where playlist_id = p_playlist_id;

  insert into public.playlist_songs (playlist_id, song_id, position, added_by)
  values (p_playlist_id, p_song_id, next_position, listener);

  update public.playlists
  set updated_at = now()
  where id = p_playlist_id;

  return next_position;
end;
$$;

revoke all on function public.add_song_to_playlist(uuid, uuid) from public;
grant execute on function public.add_song_to_playlist(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.liked_songs enable row level security;
alter table public.recently_played enable row level security;
alter table public.saved_albums enable row level security;
alter table public.followed_artists enable row level security;

-- profiles -----------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() and role = 'listener');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- artists ------------------------------------------------------------------
drop policy if exists "artists_select_authenticated" on public.artists;
create policy "artists_select_authenticated"
  on public.artists for select
  to authenticated
  using (true);

drop policy if exists "artists_admin_write" on public.artists;
create policy "artists_admin_write"
  on public.artists for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- albums -------------------------------------------------------------------
drop policy if exists "albums_select_authenticated" on public.albums;
create policy "albums_select_authenticated"
  on public.albums for select
  to authenticated
  using (true);

drop policy if exists "albums_admin_write" on public.albums;
create policy "albums_admin_write"
  on public.albums for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- songs --------------------------------------------------------------------
drop policy if exists "songs_select_published" on public.songs;
create policy "songs_select_published"
  on public.songs for select
  to authenticated
  using (is_published);

drop policy if exists "songs_admin_all" on public.songs;
create policy "songs_admin_all"
  on public.songs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- playlists ----------------------------------------------------------------
drop policy if exists "playlists_select_visible" on public.playlists;
create policy "playlists_select_visible"
  on public.playlists for select
  to authenticated
  using (is_public or owner_id = auth.uid() or public.is_admin());

drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own"
  on public.playlists for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own"
  on public.playlists for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own"
  on public.playlists for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- playlist_songs -----------------------------------------------------------
drop policy if exists "playlist_songs_select_visible" on public.playlist_songs;
create policy "playlist_songs_select_visible"
  on public.playlist_songs for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (p.is_public or p.owner_id = auth.uid())
    )
  );

drop policy if exists "playlist_songs_insert_owner" on public.playlist_songs;
create policy "playlist_songs_insert_owner"
  on public.playlist_songs for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "playlist_songs_update_owner" on public.playlist_songs;
create policy "playlist_songs_update_owner"
  on public.playlist_songs for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "playlist_songs_delete_owner" on public.playlist_songs;
create policy "playlist_songs_delete_owner"
  on public.playlist_songs for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and p.owner_id = auth.uid()
    )
  );

-- liked_songs --------------------------------------------------------------
drop policy if exists "liked_songs_select_own" on public.liked_songs;
create policy "liked_songs_select_own"
  on public.liked_songs for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "liked_songs_insert_own" on public.liked_songs;
create policy "liked_songs_insert_own"
  on public.liked_songs for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "liked_songs_delete_own" on public.liked_songs;
create policy "liked_songs_delete_own"
  on public.liked_songs for delete
  to authenticated
  using (user_id = auth.uid());

-- recently_played ----------------------------------------------------------
drop policy if exists "recently_played_select_own" on public.recently_played;
create policy "recently_played_select_own"
  on public.recently_played for select
  to authenticated
  using (user_id = auth.uid());

-- saved_albums -------------------------------------------------------------
drop policy if exists "saved_albums_select_own" on public.saved_albums;
create policy "saved_albums_select_own"
  on public.saved_albums for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "saved_albums_insert_own" on public.saved_albums;
create policy "saved_albums_insert_own"
  on public.saved_albums for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "saved_albums_delete_own" on public.saved_albums;
create policy "saved_albums_delete_own"
  on public.saved_albums for delete
  to authenticated
  using (user_id = auth.uid());

-- followed_artists ---------------------------------------------------------
drop policy if exists "followed_artists_select_own" on public.followed_artists;
create policy "followed_artists_select_own"
  on public.followed_artists for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "followed_artists_insert_own" on public.followed_artists;
create policy "followed_artists_insert_own"
  on public.followed_artists for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "followed_artists_delete_own" on public.followed_artists;
create policy "followed_artists_delete_own"
  on public.followed_artists for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.artists,
  public.albums,
  public.songs,
  public.playlists,
  public.playlist_songs,
  public.liked_songs,
  public.recently_played,
  public.saved_albums,
  public.followed_artists
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
