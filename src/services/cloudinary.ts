import { getFunctionErrorMessage, getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type CloudinaryResourceType = 'video' | 'image';

function createAbortError(): Error {
  const error = new Error('Upload cancelled.');
  error.name = 'AbortError';
  return error;
}

export type LocalUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  duration: number | null;
  bytes: number;
  format: string;
  resourceType: CloudinaryResourceType;
};

type SignatureResponse = {
  cloudName: string;
  apiKey: string;
  resourceType: CloudinaryResourceType;
  params: {
    timestamp: number;
    signature: string;
    folder: string;
    public_id: string;
    allowed_formats: string;
  };
};

type CloudinaryRawResponse = {
  secure_url?: unknown;
  public_id?: unknown;
  duration?: unknown;
  bytes?: unknown;
  format?: unknown;
  error?: { message?: unknown };
};

async function requestSignature(
  resourceType: CloudinaryResourceType,
): Promise<SignatureResponse> {
  const { data, error } = await supabase.functions.invoke<SignatureResponse>(
    'cloudinary-sign',
    { body: { resourceType } },
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        'Upload signing failed. Make sure the cloudinary-sign Edge Function is deployed.',
      ),
    );
  }
  if (!data?.cloudName || !data.apiKey || !data.params?.signature) {
    throw new Error('The upload signing service returned an invalid response.');
  }
  return data;
}

export async function uploadToCloudinary(options: {
  file: LocalUploadFile;
  resourceType: CloudinaryResourceType;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<CloudinaryUploadResult> {
  const signature = await requestSignature(options.resourceType);

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();

    form.append('file', {
      uri: options.file.uri,
      name: options.file.name,
      type: options.file.mimeType || 'application/octet-stream',
    } as unknown as Blob);
    form.append('api_key', signature.apiKey);
    form.append('timestamp', String(signature.params.timestamp));
    form.append('signature', signature.params.signature);
    form.append('folder', signature.params.folder);
    form.append('public_id', signature.params.public_id);
    form.append('allowed_formats', signature.params.allowed_formats);

    const abortHandler = () => {
      xhr.abort();
    };
    options.signal?.addEventListener('abort', abortHandler);

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abortHandler);
    };

    xhr.open('POST', endpoint);
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(Math.min(1, event.loaded / event.total));
      }
    };

    xhr.onload = () => {
      cleanup();
      let payload: CloudinaryRawResponse | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as CloudinaryRawResponse;
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.secure_url && payload.public_id) {
        options.onProgress?.(1);
        resolve({
          secureUrl: String(payload.secure_url),
          publicId: String(payload.public_id),
          duration:
            typeof payload.duration === 'number' && Number.isFinite(payload.duration)
              ? payload.duration
              : null,
          bytes: typeof payload.bytes === 'number' ? payload.bytes : 0,
          format: typeof payload.format === 'string' ? payload.format : '',
          resourceType: signature.resourceType,
        });
        return;
      }

      const serverMessage =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : `Cloudinary rejected the upload (HTTP ${xhr.status}).`;
      reject(new Error(serverMessage));
    };

    xhr.onerror = () => {
      cleanup();
      reject(
        new Error(
          'The upload could not reach Cloudinary. Check your connection and try again.',
        ),
      );
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new Error('The upload timed out. Try a smaller file or a faster connection.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(createAbortError());
    };

    try {
      xhr.send(form);
    } catch (error) {
      cleanup();
      reject(new Error(getErrorMessage(error, 'The upload could not be started.')));
    }
  });
}

export async function deleteSongAssets(songId: string): Promise<{ deleted: number }> {
  const { data, error } = await supabase.functions.invoke<{ deleted?: number }>(
    'admin-delete-song',
    { body: { songId } },
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        'The song could not be deleted. Check that the admin-delete-song function is deployed.',
      ),
    );
  }
  return { deleted: data?.deleted ?? 0 };
}

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-delete-asset', {
    body: { publicId, resourceType },
  });
  if (error) {
    throw new Error(
      await getFunctionErrorMessage(error, 'The previous media file could not be removed.'),
    );
  }
}
