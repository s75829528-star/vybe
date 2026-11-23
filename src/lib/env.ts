const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const cloudinaryCloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? '';

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  cloudinaryCloudName,
  hasSupabaseConfig: Boolean(supabaseUrl && supabaseAnonKey),
  hasCloudinaryHint: Boolean(cloudinaryCloudName),
} as const;

export function assertSupabaseConfig(): void {
  if (!env.hasSupabaseConfig) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file and rebuild the app.',
    );
  }
}
