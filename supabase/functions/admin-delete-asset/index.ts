import { requireAdmin } from '../_shared/auth.ts';
import { destroyAsset, type CloudinaryResourceType } from '../_shared/cloudinary.ts';
import { errorResponse, handleOptions, HttpError, json } from '../_shared/http.ts';

type RequestBody = {
  publicId?: unknown;
  resourceType?: unknown;
};

Deno.serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Use POST to delete an asset.');
    }

    await requireAdmin(request);

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      throw new HttpError(400, 'Send a JSON body.');
    }

    const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : '';
    const resourceType = body.resourceType;

    if (resourceType !== 'image' && resourceType !== 'video') {
      throw new HttpError(400, 'resourceType must be "image" or "video".');
    }
    // Only allow deleting media this app uploaded, never arbitrary account assets.
    if (!publicId.startsWith('vybe/') || publicId.length > 200) {
      throw new HttpError(400, 'That public id is outside the VYBE media folders.');
    }

    const result = await destroyAsset(publicId, resourceType as CloudinaryResourceType);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
});
