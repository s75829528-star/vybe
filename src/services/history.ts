import { logError } from '@/lib/errors';
import { refreshCatalogue } from '@/stores/catalogueStore';
import { supabase } from '@/lib/supabase';

/**
 * Records a play for the signed-in listener and increments the global counter
 * atomically inside Postgres. Failures are non-fatal: playback must continue.
 */
export async function recordSongPlay(songId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_song_play', { p_song_id: songId });
    if (error) throw error;
    refreshCatalogue();
  } catch (error) {
    logError('history/recordPlay', error);
  }
}
