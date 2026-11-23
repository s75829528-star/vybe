import { adminClient, requireAdmin } from '../_shared/auth.ts';
import { destroyAsset } from '../_shared/cloudinary.ts';
import { errorResponse, handleOptions, HttpError, json } from '../_shared/http.ts';

type RequestBody = {
  songId?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Use POST to delete a song.');
    }

    await requireAdmin(request);

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      throw new HttpError(400, 'Send a JSON body.');
    }

    const songId = typeof body.songId === 'string' ? body.songId : '';
    if (!UUID_PATTERN.test(songId)) {
      throw new HttpError(400, 'A valid song id is required.');
    }

    const client = adminClient();
    const { data: song, error: fetchError } = await client
      .from('songs')
      .select('id, audio_public_id, cover_public_id')
      .eq('id', songId)
      .maybeSingle();

    if (fetchError) throw new HttpError(500, fetchError.message);
    if (!song) throw new HttpError(404, 'This song no longer exists.');

    let deleted = 0;
    const failures: string[] = [];

    if (song.audio_public_id) {
      try {
        await destroyAsset(song.audio_public_id, 'video');
        deleted += 1;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Audio deletion failed.');
      }
    }

    if (song.cover_public_id) {
      try {
        await destroyAsset(song.cover_public_id, 'image');
        deleted += 1;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Artwork deletion failed.');
      }
    }

    const { error: deleteError } = await client.from('songs').delete().eq('id', songId);
    if (deleteError) throw new HttpError(500, deleteError.message);

    return json({ deleted, warnings: failures });
  } catch (error) {
    return errorResponse(error);
  }
});
