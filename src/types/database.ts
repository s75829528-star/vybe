export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'listener' | 'admin';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      artists: {
        Row: {
          id: string;
          name: string;
          bio: string | null;
          image_url: string | null;
          image_public_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          bio?: string | null;
          image_url?: string | null;
          image_public_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          bio?: string | null;
          image_url?: string | null;
          image_public_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artists_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      albums: {
        Row: {
          id: string;
          title: string;
          artist_id: string | null;
          cover_url: string | null;
          cover_public_id: string | null;
          release_year: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist_id?: string | null;
          cover_url?: string | null;
          cover_public_id?: string | null;
          release_year?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          artist_id?: string | null;
          cover_url?: string | null;
          cover_public_id?: string | null;
          release_year?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'albums_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
      songs: {
        Row: {
          id: string;
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
          published_at: string | null;
          play_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist_id: string;
          album_id?: string | null;
          track_number?: number | null;
          genre: string;
          language: string;
          duration_seconds?: number | null;
          audio_url: string;
          audio_public_id: string;
          cover_url?: string | null;
          cover_public_id?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          play_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          artist_id?: string;
          album_id?: string | null;
          track_number?: number | null;
          genre?: string;
          language?: string;
          duration_seconds?: number | null;
          audio_url?: string;
          audio_public_id?: string;
          cover_url?: string | null;
          cover_public_id?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'songs_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'songs_album_id_fkey';
            columns: ['album_id'];
            isOneToOne: false;
            referencedRelation: 'albums';
            referencedColumns: ['id'];
          },
        ];
      };
      playlists: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          cover_url: string | null;
          cover_public_id: string | null;
          owner_id: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          cover_url?: string | null;
          cover_public_id?: string | null;
          owner_id: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          cover_url?: string | null;
          cover_public_id?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'playlists_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      playlist_songs: {
        Row: {
          playlist_id: string;
          song_id: string;
          position: number;
          added_by: string | null;
          added_at: string;
        };
        Insert: {
          playlist_id: string;
          song_id: string;
          position?: number;
          added_by?: string | null;
          added_at?: string;
        };
        Update: {
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'playlist_songs_playlist_id_fkey';
            columns: ['playlist_id'];
            isOneToOne: false;
            referencedRelation: 'playlists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'playlist_songs_song_id_fkey';
            columns: ['song_id'];
            isOneToOne: false;
            referencedRelation: 'songs';
            referencedColumns: ['id'];
          },
        ];
      };
      liked_songs: {
        Row: {
          user_id: string;
          song_id: string;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          song_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'liked_songs_song_id_fkey';
            columns: ['song_id'];
            isOneToOne: false;
            referencedRelation: 'songs';
            referencedColumns: ['id'];
          },
        ];
      };
      recently_played: {
        Row: {
          user_id: string;
          song_id: string;
          played_at: string;
          play_count: number;
        };
        Insert: {
          user_id?: string;
          song_id: string;
          played_at?: string;
          play_count?: number;
        };
        Update: {
          played_at?: string;
          play_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'recently_played_song_id_fkey';
            columns: ['song_id'];
            isOneToOne: false;
            referencedRelation: 'songs';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_albums: {
        Row: {
          user_id: string;
          album_id: string;
          saved_at: string;
        };
        Insert: {
          user_id?: string;
          album_id: string;
          saved_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'saved_albums_album_id_fkey';
            columns: ['album_id'];
            isOneToOne: false;
            referencedRelation: 'albums';
            referencedColumns: ['id'];
          },
        ];
      };
      followed_artists: {
        Row: {
          user_id: string;
          artist_id: string;
          followed_at: string;
        };
        Insert: {
          user_id?: string;
          artist_id: string;
          followed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'followed_artists_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      record_song_play: {
        Args: { p_song_id: string };
        Returns: undefined;
      };
      add_song_to_playlist: {
        Args: { p_playlist_id: string; p_song_id: string };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type Artist = Tables<'artists'>;
export type Album = Tables<'albums'>;
export type Song = Tables<'songs'>;
export type Playlist = Tables<'playlists'>;
export type PlaylistSong = Tables<'playlist_songs'>;

export type ArtistRef = Pick<Artist, 'id' | 'name'>;
export type AlbumRef = Pick<Album, 'id' | 'title' | 'cover_url'>;

export type SongWithRelations = Song & {
  artist: ArtistRef | null;
  album: AlbumRef | null;
};

export type PlaylistWithOwner = Playlist & {
  owner: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
};

export type AlbumWithArtist = Album & {
  artist: ArtistRef | null;
};

export type PlaylistSongWithSong = PlaylistSong & {
  song: SongWithRelations | null;
};

export type LikedSongRow = Tables<'liked_songs'> & {
  song: SongWithRelations | null;
};

export type RecentlyPlayedRow = Tables<'recently_played'> & {
  song: SongWithRelations | null;
};

export type SavedAlbumRow = Tables<'saved_albums'> & {
  album: AlbumWithArtist | null;
};

export type FollowedArtistRow = Tables<'followed_artists'> & {
  artist: Artist | null;
};
