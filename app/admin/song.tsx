import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { CoverArt } from '@/components/ui/CoverArt';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import {
  hasErrors,
  validateAudioFile,
  validateImageFile,
  validateSongMetadata,
  type SongMetadataErrors,
} from '@/features/admin/validation';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { AUDIO_MIME_TYPES, GENRES, LANGUAGES } from '@/lib/constants';
import { getErrorMessage, isAbortError, logError } from '@/lib/errors';
import { formatDuration } from '@/lib/format';
import {
  createSong,
  fetchAdminSongById,
  findArtistSuggestions,
  findOrCreateAlbum,
  findOrCreateArtist,
  updateSong,
  type SongUpsertInput,
} from '@/services/admin';
import {
  deleteCloudinaryAsset,
  deleteSongAssets,
  uploadToCloudinary,
  type LocalUploadFile,
} from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { useCatalogueStore } from '@/stores/catalogueStore';
import { toast } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';
import type { Artist, SongWithRelations } from '@/types/database';

function readablePickerError(error: unknown): string {
  return getErrorMessage(error, 'The file picker could not be opened.');
}

export default function AdminSongScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const songId = typeof params.id === 'string' ? params.id : '';
  const isEditing = songId.length > 0;

  const isAdmin = useAuthStore((state) => state.isAdmin);
  const status = useAuthStore((state) => state.status);

  const [existing, setExisting] = useState<SongWithRelations | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [publishNow, setPublishNow] = useState(false);

  const [audioFile, setAudioFile] = useState<LocalUploadFile | null>(null);
  const [artworkFile, setArtworkFile] = useState<LocalUploadFile | null>(null);

  const [fieldErrors, setFieldErrors] = useState<SongMetadataErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<Artist[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const debouncedArtist = useDebouncedValue(artistName.trim(), 400);

  useEffect(() => {
    if (!isEditing) return;
    let active = true;
    setLoading(true);
    fetchAdminSongById(songId)
      .then((song) => {
        if (!active) return;
        setExisting(song);
        setTitle(song.title);
        setArtistName(song.artist?.name ?? '');
        setAlbumTitle(song.album?.title ?? '');
        setGenre(song.genre);
        setLanguage(song.language);
        setTrackNumber(song.track_number != null ? String(song.track_number) : '');
        setPublishNow(song.is_published);
        setLoadError(null);
      })
      .catch((fetchError) => {
        if (!active) return;
        setLoadError(getErrorMessage(fetchError, 'This song could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEditing, songId]);

  useEffect(() => {
    if (debouncedArtist.length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    findArtistSuggestions(debouncedArtist)
      .then((results) => {
        if (active) setSuggestions(results.filter((artist) => artist.name !== artistName.trim()));
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [artistName, debouncedArtist]);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...AUDIO_MIME_TYPES],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      const candidate: LocalUploadFile = {
        uri: asset.uri,
        name: asset.name || `audio-${Date.now()}.mp3`,
        mimeType: asset.mimeType ?? null,
        size: asset.size ?? null,
      };
      const validation = validateAudioFile(candidate);
      if (validation) {
        setError(validation);
        return;
      }
      setAudioFile(candidate);
      setError(null);
    } catch (pickerError) {
      setError(readablePickerError(pickerError));
    }
  };

  const pickArtwork = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.info('Allow photo access to choose cover artwork.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      const candidate: LocalUploadFile = {
        uri: asset.uri,
        name: asset.fileName ?? `artwork-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? null,
        size: asset.fileSize ?? null,
      };
      const validation = validateImageFile(candidate);
      if (validation) {
        setError(validation);
        return;
      }
      setArtworkFile(candidate);
      setError(null);
    } catch (pickerError) {
      setError(readablePickerError(pickerError));
    }
  };

  const handleSubmit = async () => {
    if (submitting || !isAdmin) return;

    const metadata = {
      title,
      artistName,
      albumTitle,
      genre,
      language,
      trackNumber,
      publishNow,
    };
    const errors = validateSongMetadata(metadata);
    setFieldErrors(errors);

    if (hasErrors(errors)) {
      setError('Fix the highlighted fields before saving.');
      return;
    }
    if (!isEditing && !audioFile) {
      setError('Choose an audio file to upload.');
      return;
    }
    if (!isEditing && !existing) {
      setError('The upload could not be prepared. Reload this screen and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setStatusText('Uploading audio');
      const audioResult = audioFile
        ? await uploadToCloudinary({
            file: audioFile,
            resourceType: 'video',
            onProgress: (value) => setProgress(value),
            signal: controller.signal,
          })
        : null;

      setStatusText('Uploading artwork');
      setProgress(0);
      const artworkResult = artworkFile
        ? await uploadToCloudinary({
            file: artworkFile,
            resourceType: 'image',
            onProgress: (value) => setProgress(value),
            signal: controller.signal,
          })
        : null;

      setStatusText('Saving to catalogue');
      setProgress(1);

      const artist = await findOrCreateArtist(metadata.artistName);
      const coverUrl = artworkResult?.secureUrl ?? existing?.cover_url ?? null;
      const coverPublicId = artworkResult?.publicId ?? existing?.cover_public_id ?? null;
      const album = metadata.albumTitle.trim()
        ? await findOrCreateAlbum(metadata.albumTitle, artist.id, coverUrl, coverPublicId)
        : null;

      const audioUrl = audioResult?.secureUrl ?? existing?.audio_url ?? '';
      const audioPublicId = audioResult?.publicId ?? existing?.audio_public_id ?? '';
      if (!audioUrl || !audioPublicId) {
        throw new Error('An audio file is required.');
      }

      const durationSeconds =
        audioResult?.duration ?? existing?.duration_seconds ?? null;

      const payload: SongUpsertInput = {
        title: metadata.title.trim(),
        artist_id: artist.id,
        album_id: album?.id ?? null,
        track_number: metadata.trackNumber.trim() ? Number(metadata.trackNumber) : null,
        genre: metadata.genre.trim(),
        language: metadata.language.trim(),
        duration_seconds:
          durationSeconds != null && Number.isFinite(durationSeconds)
            ? Math.max(1, Math.round(durationSeconds))
            : null,
        audio_url: audioUrl,
        audio_public_id: audioPublicId,
        cover_url: coverUrl,
        cover_public_id: coverPublicId,
        is_published: metadata.publishNow,
      };

      if (isEditing) {
        await updateSong(songId, payload);
      } else {
        await createSong(payload);
      }

      if (audioResult && existing?.audio_public_id && existing.audio_public_id !== audioResult.publicId) {
        deleteCloudinaryAsset(existing.audio_public_id, 'video').catch((cleanupError) =>
          logError('admin/replaceAudioCleanup', cleanupError),
        );
      }
      if (artworkResult && existing?.cover_public_id && existing.cover_public_id !== artworkResult.publicId) {
        deleteCloudinaryAsset(existing.cover_public_id, 'image').catch((cleanupError) =>
          logError('admin/replaceArtworkCleanup', cleanupError),
        );
      }

      useCatalogueStore.getState().refresh({ force: true });
      toast.success(isEditing ? 'Song updated' : 'Song uploaded');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/admin');
      }
    } catch (submitError) {
      if (isAbortError(submitError)) {
        toast.info('Upload cancelled.');
        setError('Upload cancelled.');
      } else {
        setError(getErrorMessage(submitError, 'The song could not be saved.'));
      }
    } finally {
      setSubmitting(false);
      setStatusText(null);
      setProgress(0);
      abortRef.current = null;
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert(
      'Delete song?',
      `“${existing.title}” and its uploaded media will be deleted permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSubmitting(true);
              setStatusText('Deleting song');
              try {
                await deleteSongAssets(existing.id);
                useCatalogueStore.getState().refresh({ force: true });
                toast.success('Song deleted');
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/admin');
                }
              } catch (deleteError) {
                setError(getErrorMessage(deleteError, 'The song could not be deleted.'));
              } finally {
                setSubmitting(false);
                setStatusText(null);
              }
            })();
          },
        },
      ],
    );
  };

  if (status === 'authenticated' && !isAdmin) {
    return (
      <View style={styles.root}>
        <ScreenHeader showBack title="Upload song" />
        <EmptyState
          icon="shield-outline"
          title="Admins only"
          message="Your account does not have catalogue permissions."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader showBack title="Edit song" />
        <View style={styles.loading}>
          <ProgressBar progress={0.4} />
          <AppText variant="small" color={colors.textSecondary}>
            Loading song…
          </AppText>
        </View>
      </View>
    );
  }

  if (loadError || (isEditing && !existing)) {
    return (
      <View style={styles.root}>
        <ScreenHeader showBack title="Edit song" />
        <EmptyState
          icon="alert-circle-outline"
          title="Song unavailable"
          message={loadError ?? 'This song no longer exists.'}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const artworkUri = artworkFile?.uri ?? existing?.cover_url ?? null;

  return (
    <View style={styles.root}>
      <ScreenHeader showBack title={isEditing ? 'Edit song' : 'Upload song'} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <AppText variant="h2">{isEditing ? 'Update this track' : 'Add to the catalogue'}</AppText>
            <AppText variant="small" color={colors.textSecondary}>
              Audio and artwork upload directly to Cloudinary using a short-lived signature issued
              by your admin account. No API secret is stored on the device.
            </AppText>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <AppText variant="h3">Media</AppText>
              {existing ? (
                <Badge
                  label={existing.is_published ? 'Published' : 'Draft'}
                  tone={existing.is_published ? 'success' : 'warning'}
                />
              ) : null}
            </View>

            <Pressable
              onPress={() => void pickAudio()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={audioFile || existing ? 'Replace audio file' : 'Choose audio file'}
              style={({ pressed }) => [styles.dropzone, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.dropIcon}>
                <Ionicons
                  name={audioFile || existing ? 'musical-notes' : 'cloud-upload-outline'}
                  size={22}
                  color={colors.violet}
                />
              </View>
              <View style={styles.dropCopy}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {audioFile
                    ? audioFile.name
                    : existing
                      ? 'Replace current audio'
                      : 'Choose an audio file'}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {audioFile
                    ? 'Ready to upload'
                    : existing
                      ? `Current track · ${formatDuration(existing.duration_seconds)}`
                      : 'MP3, M4A, AAC, WAV, FLAC, OGG or OPUS'}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
            </Pressable>

            <Pressable
              onPress={() => void pickArtwork()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={artworkUri ? 'Replace artwork' : 'Choose artwork'}
              style={({ pressed }) => [styles.artRow, pressed && { opacity: 0.8 }]}
            >
              <CoverArt url={artworkUri} seed={title || songId} size={64} radius={12} />
              <View style={styles.dropCopy}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {artworkFile ? artworkFile.name : artworkUri ? 'Cover artwork' : 'Add cover artwork'}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {artworkFile
                    ? 'Selected · 1:1 crop'
                    : artworkUri
                      ? 'Tap to choose a different image'
                      : 'JPG, PNG or WebP · optional'}
                </AppText>
              </View>
              <Ionicons name="images-outline" size={19} color={colors.textTertiary} />
            </Pressable>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>
              Details
            </AppText>
            <TextField
              label="Song title"
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (fieldErrors.title) setFieldErrors((current) => ({ ...current, title: undefined }));
              }}
              placeholder="Track name"
              maxLength={200}
              error={fieldErrors.title}
            />
            <TextField
              label="Artist"
              value={artistName}
              onChangeText={(value) => {
                setArtistName(value);
                if (fieldErrors.artistName) {
                  setFieldErrors((current) => ({ ...current, artistName: undefined }));
                }
              }}
              placeholder="Artist name"
              maxLength={160}
              error={fieldErrors.artistName}
              hint="An existing artist is reused when the name matches. Otherwise a new artist is created."
            />
            {suggestions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestions}
              >
                {suggestions.map((artist) => (
                  <Chip key={artist.id} onPress={() => setArtistName(artist.name)}>
                    {artist.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : null}
            <TextField
              label="Album (optional)"
              value={albumTitle}
              onChangeText={setAlbumTitle}
              placeholder="Album title"
              maxLength={200}
              error={fieldErrors.albumTitle}
              hint="Leave blank for a standalone single."
            />
            <TextField
              label="Track number (optional)"
              value={trackNumber}
              onChangeText={(value) => {
                setTrackNumber(value.replace(/[^0-9]/g, ''));
                if (fieldErrors.trackNumber) {
                  setFieldErrors((current) => ({ ...current, trackNumber: undefined }));
                }
              }}
              placeholder="1"
              keyboardType="number-pad"
              maxLength={3}
              error={fieldErrors.trackNumber}
            />

            <View style={styles.chipGroup}>
              <AppText variant="captionBold" color={colors.textSecondary}>
                Genre
              </AppText>
              <View style={styles.chips}>
                {GENRES.map((option) => (
                  <Chip
                    key={option}
                    selected={genre === option}
                    onPress={() => {
                      setGenre(option);
                      setFieldErrors((current) => ({ ...current, genre: undefined }));
                    }}
                  >
                    {option}
                  </Chip>
                ))}
              </View>
              {fieldErrors.genre ? (
                <AppText variant="caption" color={colors.danger}>
                  {fieldErrors.genre}
                </AppText>
              ) : null}
            </View>

            <View style={styles.chipGroup}>
              <AppText variant="captionBold" color={colors.textSecondary}>
                Language
              </AppText>
              <View style={styles.chips}>
                {LANGUAGES.map((option) => (
                  <Chip
                    key={option}
                    selected={language === option}
                    onPress={() => {
                      setLanguage(option);
                      setFieldErrors((current) => ({ ...current, language: undefined }));
                    }}
                  >
                    {option}
                  </Chip>
                ))}
              </View>
              {fieldErrors.language ? (
                <AppText variant="caption" color={colors.danger}>
                  {fieldErrors.language}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>
              Publishing
            </AppText>
            <View style={styles.publishRow}>
              <View style={styles.publishCopy}>
                <AppText variant="bodyBold">Publish immediately</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {publishNow
                    ? 'This song will be visible to every listener as soon as it saves.'
                    : 'Saved as a draft. Only admins can see drafts.'}
                </AppText>
              </View>
              <Switch
                value={publishNow}
                onValueChange={setPublishNow}
                trackColor={{ true: colors.primaryDeep, false: colors.surfaceHigh }}
                thumbColor={publishNow ? colors.violet : colors.textTertiary}
                accessibilityLabel="Publish immediately"
                disabled={submitting}
              />
            </View>
          </View>

          {submitting && statusText ? (
            <View style={styles.uploadCard}>
              <View style={styles.uploadHead}>
                <AppText variant="smallBold">{statusText}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {Math.round(progress * 100)}%
                </AppText>
              </View>
              <ProgressBar progress={progress} height={4} />
              <Button
                label="Cancel upload"
                variant="ghost"
                size="sm"
                onPress={() => abortRef.current?.abort()}
                style={styles.cancel}
              />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={17} color={colors.danger} />
              <AppText variant="small" color={colors.danger} style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button
            label={
              submitting
                ? 'Working…'
                : isEditing
                  ? publishNow
                    ? 'Save & publish'
                    : 'Save draft'
                  : publishNow
                    ? 'Upload & publish'
                    : 'Upload as draft'
            }
            icon={isEditing ? 'checkmark' : 'cloud-upload-outline'}
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={submitting}
            fullWidth
            size="lg"
          />

          {isEditing ? (
            <View style={styles.dangerZone}>
              <AppText variant="label" color={colors.textTertiary}>
                Danger zone
              </AppText>
              <Button
                label="Delete song and media"
                icon="trash-outline"
                variant="danger"
                onPress={handleDelete}
                disabled={submitting}
                fullWidth
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.massive,
    gap: spacing.lg,
  },
  intro: {
    gap: spacing.xs,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  dropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: 'rgba(192,132,252,0.45)',
    backgroundColor: colors.primarySofter,
  },
  dropIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropCopy: {
    flex: 1,
    gap: 2,
  },
  artRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  suggestions: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipGroup: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  publishCopy: {
    flex: 1,
    gap: 2,
  },
  uploadCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  uploadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    alignSelf: 'flex-start',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
  },
  dangerZone: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
