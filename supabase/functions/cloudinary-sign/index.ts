import { requireAdmin } from '../_shared/auth.ts';
import {
  cloudinaryConfig,
  signParams,
  type CloudinaryResourceType,
} from '../_shared/cloudinary.ts';
import { errorResponse, handleOptions, HttpError, json } from '../_shared/http.ts';

const FOLDERS: Record<CloudinaryResourceType, string> = {
  video: 'vybe/audio',
  image: 'vybe/artwork',
};

const ALLOWED_FORMATS: Record<CloudinaryResourceType, string> = {
  video: 'mp3,m4a,aac,wav,flac,ogg,opus',
  image: 'jpg,jpeg,png,webp',
};

type RequestBody = {
  resourceType?: unknown;
};

Deno.serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Use POST for upload signatures.');
    }

    await requireAdmin(request);

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      throw new HttpError(400, 'Send a JSON body.');
    }

    if (body.resourceType !== 'video' && body.resourceType !== 'image') {
      throw new HttpError(400, 'resourceType must be "video" (audio) or "image" (artwork).');
    }

    const resourceType = body.resourceType;
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();

    const params = {
      allowed_formats: ALLOWED_FORMATS[resourceType],
      folder: FOLDERS[resourceType],
      public_id: crypto.randomUUID(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    const signature = await signParams(params, apiSecret);

    return json({
      cloudName,
      apiKey,
      resourceType,
      params: { ...params, signature },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
