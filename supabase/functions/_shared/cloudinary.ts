import { HttpError } from './http.ts';

export type CloudinaryResourceType = 'image' | 'video';

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function cloudinaryConfig(): CloudinaryConfig {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? '';
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? '';
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? '';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new HttpError(500, 'Cloudinary is not configured on the server.');
  }
  return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Cloudinary signs a sorted, `&`-joined list of parameters (excluding file,
 * api_key, cloud_name, resource_type and signature) with the API secret.
 */
export async function signParams(
  params: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return sha1Hex(`${payload}${apiSecret}`);
}

export async function destroyAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<{ result: string }> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signParams({ public_id: publicId, timestamp }, apiSecret);

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    result?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new HttpError(
      502,
      payload?.error?.message ?? `Cloudinary could not delete the asset (HTTP ${response.status}).`,
    );
  }

  return { result: payload?.result ?? 'ok' };
}
