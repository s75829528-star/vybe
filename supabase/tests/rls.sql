-- ===========================================================================
-- VYBE RLS + RPC verification
-- Run after bootstrap.sql and both migrations against an empty database.
-- The whole suite runs in a transaction and rolls back.
-- ===========================================================================

begin;

-- Seed auth users. The trigger creates their profiles.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'listener@vybe.test', '{"display_name":"Listener One"}'),
  ('22222222-2222-4222-8222-222222222222', 'admin@vybe.test', '{"display_name":"Admin User"}'),
  ('33333333-3333-4333-8333-333333333333', 'other@vybe.test', '{"display_name":"Other Listener"}');

select public.test_assert(
  (select count(*) from public.profiles) = 3,
  'sign-up trigger should create one profile per auth user'
);

select public.test_assert(
  (select role from public.profiles where id = '11111111-1111-4111-8111-111111111111') = 'listener',
  'new profiles default to listener'
);

-- Promote the admin directly, simulating a trusted backend/dashboard action.
update public.profiles
set role = 'admin'
where id = '22222222-2222-4222-8222-222222222222';

-- ---------------------------------------------------------------------------
-- Admin can write the catalogue
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select public.test_assert(public.is_admin(), 'admin profile should be recognised');

insert into public.artists (id, name, bio)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test Artist', 'Created by the RLS suite');

insert into public.albums (id, title, artist_id, release_year)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Test Album', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2026);

insert into public.songs (
  id, title, artist_id, album_id, track_number, genre, language,
  duration_seconds, audio_url, audio_public_id, cover_url, cover_public_id,
  is_published, published_at
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Published Song',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1,
    'Pop', 'English', 215,
    'https://res.cloudinary.com/demo/video/upload/vybe/audio/published.mp3',
    'vybe/audio/published', 'https://res.cloudinary.com/demo/image/upload/vybe/artwork/published.jpg',
    'vybe/artwork/published', true, now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Draft Song',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, null,
    'Tamil', 'Tamil', 180,
    'https://res.cloudinary.com/demo/video/upload/vybe/audio/draft.mp3',
    'vybe/audio/draft', null, null, false, null
  );

select public.test_assert(
  (select count(*) from public.songs) = 2,
  'admin sees drafts and published songs'
);

-- ---------------------------------------------------------------------------
-- Listener read constraints
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select public.test_assert(
  (select count(*) from public.songs) = 1,
  'listener sees only published songs'
);
select public.test_assert(
  (select count(*) from public.songs where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') = 0,
  'listener cannot read a draft by id'
);
select public.test_assert(not public.is_admin(), 'listener is not an admin');

-- Listener cannot write catalogue rows.
do $$
begin
  begin
    insert into public.songs (
      title, artist_id, genre, language, audio_url, audio_public_id
    ) values (
      'Unauthorised', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pop', 'English',
      'https://res.cloudinary.com/demo/video/upload/vybe/audio/x.mp3', 'vybe/audio/x'
    );
    raise exception 'listener was able to insert a song';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

do $$
begin
  begin
    update public.songs
    set title = 'Hijacked'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    if found then
      raise exception 'listener was able to update a song';
    end if;
  exception
    when insufficient_privilege then null;
  end;
end
$$;

-- Listener cannot escalate their own role.
do $$
begin
  begin
    update public.profiles
    set role = 'admin'
    where id = '11111111-1111-4111-8111-111111111111';
    raise exception 'listener escalated their role';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

update public.profiles
set display_name = 'Listener One Updated'
where id = '11111111-1111-4111-8111-111111111111';

select public.test_assert(
  (select display_name from public.profiles where id = '11111111-1111-4111-8111-111111111111') = 'Listener One Updated',
  'listener can update their own display name'
);

-- ---------------------------------------------------------------------------
-- Likes, history and saves
-- ---------------------------------------------------------------------------
insert into public.liked_songs (song_id)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

select public.test_assert(
  (select count(*) from public.liked_songs) = 1,
  'listener can like a published song'
);

do $$
begin
  begin
    insert into public.liked_songs (user_id, song_id)
    values ('33333333-3333-4333-8333-333333333333', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    raise exception 'listener inserted a like for another user';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select public.record_song_play('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

select public.test_assert(
  (select play_count from public.songs where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') = 1,
  'record_song_play increments the song play counter'
);
select public.test_assert(
  (select count(*) from public.recently_played) = 1,
  'record_song_play writes one history row for the listener'
);

do $$
begin
  begin
    perform public.record_song_play('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    raise exception 'listener recorded a play for a draft song';
  exception
    when no_data_found then null;
  end;
end
$$;

insert into public.saved_albums (album_id)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into public.followed_artists (artist_id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

select public.test_assert(
  (select count(*) from public.saved_albums) = 1
    and (select count(*) from public.followed_artists) = 1,
  'listener can save an album and follow an artist'
);

-- ---------------------------------------------------------------------------
-- Playlists
-- ---------------------------------------------------------------------------
insert into public.playlists (id, title, is_public)
values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Public Mix', true),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'Private Mix', false);

select public.test_assert(
  (select count(*) from public.playlists) = 2,
  'owner sees both public and private playlists'
);

select public.test_assert(
  public.add_song_to_playlist(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ) = 1,
  'add_song_to_playlist appends the first song at position 1'
);

select public.test_assert(
  public.add_song_to_playlist(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ) = 1,
  'add_song_to_playlist is idempotent for an existing song'
);

select public.test_assert(
  (select count(*) from public.playlist_songs) = 1,
  'duplicate playlist adds are ignored'
);

do $$
begin
  begin
    insert into public.playlists (title, owner_id)
    values ('Forged owner', '33333333-3333-4333-8333-333333333333');
    raise exception 'listener created a playlist for another user';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- Second listener isolation
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

select public.test_assert(
  (select count(*) from public.playlists) = 1,
  'other listener sees only the public playlist'
);
select public.test_assert(
  (select count(*) from public.liked_songs) = 0,
  'other listener cannot read the first listener likes'
);
select public.test_assert(
  (select count(*) from public.recently_played) = 0,
  'other listener cannot read the first listener history'
);
select public.test_assert(
  (select count(*) from public.saved_albums) = 0
    and (select count(*) from public.followed_artists) = 0,
  'saved albums and followed artists are private'
);
select public.test_assert(
  (select count(*) from public.playlist_songs) = 1,
  'other listener can read songs in a public playlist'
);

do $$
begin
  begin
    perform public.add_song_to_playlist(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    );
    raise exception 'other listener modified a playlist they do not own';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

do $$
begin
  begin
    delete from public.playlist_songs
    where playlist_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    if found then
      raise exception 'other listener removed a song from a playlist they do not own';
    end if;
  exception
    when insufficient_privilege then null;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- Admin moderation
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

update public.songs
set title = 'Draft Song (edited)'
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select public.test_assert(
  (select title from public.songs where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') = 'Draft Song (edited)',
  'admin can edit a draft'
);

delete from public.playlists where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

select public.test_assert(
  not exists (select 1 from public.playlists where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
  'admin can delete any playlist'
);

-- ---------------------------------------------------------------------------
-- Anonymous clients have no catalogue access
-- ---------------------------------------------------------------------------
reset role;
set role anon;

do $$
begin
  begin
    perform count(*) from public.songs;
    raise exception 'anon was able to read songs';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

reset role;
rollback;

select 'ALL VYBE RLS TESTS PASSED' as result;
