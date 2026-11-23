# VYBE

VYBE is an Android-first music streaming app built with React Native and Expo. It includes account sign-in, music discovery, personal library tools, playback and queue controls, and a protected admin catalogue workflow.

## Features

- Email authentication and profile-backed roles through Supabase.
- Home, Search, Library, and Settings tabs, plus song, album, artist, and playlist detail screens.
- Background audio playback, queue management, repeat and shuffle controls, and playback notifications through `react-native-track-player`.
- Likes, saved albums, followed artists, and playlists stored in Supabase.
- Admin-only song upload, edit, and delete flows. Audio and artwork are stored in Cloudinary; uploads use a signed Supabase Edge Function.
- Supabase row-level security and database functions restrict user and admin operations.

Offline downloads are not implemented; the download affordance is a placeholder. iOS is not a supported target. Live backend, upload, and device playback checks require project credentials and an Android device.

## Architecture

- `app/`: Expo Router screens and navigation.
- `src/features/`: feature-specific components and logic for auth, catalogue, library, player, and admin.
- `src/services/`: Supabase-backed data and admin operations.
- `src/stores/`: Zustand state for auth, catalogue, library, player, and UI.
- `src/lib/`: client configuration, formatting, search sanitization, and shared helpers.
- `plugins/withTrackPlayer.js`: Android media service and foreground playback permissions.
- `supabase/migrations/`: schema, functions, and row-level security policies.
- `supabase/functions/`: signed Cloudinary upload and protected asset/song deletion endpoints.
- `scripts/db-test.sh`: Docker-backed PostgreSQL migration and RLS verification.

The Android app uses Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript strict mode, Supabase, Cloudinary, Zustand, and Track Player 4.1.2. New Architecture is disabled because Track Player 4.1.2 requires `newArchEnabled: false`. The `patches/` patch is applied by `postinstall`; keep it in place.

## Prerequisites

- Node.js 20 or newer and npm.
- A Supabase project and a Cloudinary account for live catalogue and admin upload use.
- For Android builds: JDK 17, Android SDK command-line tools, Android platform 36 (35 is also installed for compatibility), Android Build Tools 36.0.0, platform-tools, and NDK 27.1.12297006.
- Docker for the database/RLS test script.

## Local setup

```sh
npm install
cp .env.example .env
```

Set these client variables in `.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key for the client. Never use the service-role key here. |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name shown in app information. It does not grant upload privileges. |

Start the development client after configuring the environment:

```sh
npx expo start --dev-client
```

On a configured Android development machine, run `npm run android` to prebuild and launch the app. The initial development client build requires the Android toolchain below.

## Supabase and Cloudinary setup

1. Create a Supabase project and copy its project URL and anon/publishable key into `.env`.
2. Apply the SQL files in `supabase/migrations/` in filename order using the Supabase CLI (`supabase db push`) or the SQL editor. The migrations define the schema, RLS policies, and database RPCs.
3. Configure the Cloudinary cloud name, API key, and API secret in the Cloudinary dashboard. Keep the API secret on the server only.
4. Deploy all functions under `supabase/functions/`:

   ```sh
   supabase functions deploy cloudinary-sign
   supabase functions deploy admin-delete-song
   supabase functions deploy admin-delete-asset
   ```

5. Set the required function secrets. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions; configure the Cloudinary values with:

   ```sh
   supabase secrets set CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
   ```

   These are Edge Function secrets and must never be added to the Expo `.env` or client bundle. The API key is not secret by itself, but is server-configured for signing.
6. Register a user through the app, then grant admin access to that account from the trusted SQL editor using its Auth user UUID:

   ```sql
   update public.profiles set role='admin' where id='<user-uuid>';
   ```

The Supabase CLI can be installed separately; log in and link the project before using its `db`, `functions`, and `secrets` commands. Keep `ALLOWED_ORIGIN` at its default during development or configure it as an Edge Function secret for a restricted deployment.

## Common commands

```sh
npm install
npx expo start --dev-client
npm run android
npx tsc --noEmit
npx expo lint
npx jest
npx expo export --platform android
scripts/db-test.sh
```

`scripts/db-test.sh` starts an isolated PostgreSQL container with Docker and verifies the migrations and RLS policies. It does not test a hosted Supabase project.

## Android debug APK

Install JDK 17 and Android SDK command-line tools, then install Android platform 36, Build Tools 36.0.0, platform-tools, and NDK 27.1.12297006. Set `JAVA_HOME` to the JDK 17 directory and `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) to the SDK directory. For example:

```sh
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/Android/Sdk
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npx expo prebuild -p android --clean
cd android
./gradlew assembleDebug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The prebuild generates Android project files; after a clean prebuild, check that the manifest still contains `MusicService`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and `POST_NOTIFICATIONS` before shipping.

## Verification and limits

Pure logic and mocked playback tests run in Jest. TypeScript, lint, JS export, and the PostgreSQL RLS suite can be checked locally. No live Supabase or Cloudinary credentials are included in the repository, so hosted sign-in, streaming, uploads, and destructive admin operations need to be checked against a configured project. Notification behavior and playback while backgrounded need an Android device. Downloads remain a placeholder, and iOS is not targeted.
