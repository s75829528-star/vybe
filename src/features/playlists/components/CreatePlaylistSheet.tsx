import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage } from '@/lib/errors';
import { createPlaylist } from '@/services/playlists';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string) => void;
};

export function CreatePlaylistSheet({ visible, onClose, onCreated }: Props) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setIsPublic(false);
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!userId || saving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give your playlist a name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const playlist = await createPlaylist(userId, {
        title: trimmed,
        description,
        isPublic,
      });
      toast.success('Playlist created');
      onClose();
      onCreated?.(playlist.id);
    } catch (createError) {
      setError(getErrorMessage(createError, 'The playlist could not be created.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="New playlist" maxHeight="80%">
      <View style={styles.body}>
        <TextField
          label="Name"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (error) setError(null);
          }}
          placeholder="Late night drives"
          maxLength={120}
          autoFocus
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What is this playlist about?"
          multiline
          maxLength={400}
        />
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <AppText variant="bodyBold">Make it public</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Public playlists can appear on Home and in search.
            </AppText>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ true: colors.primaryDeep, false: colors.surfaceHigh }}
            thumbColor={isPublic ? colors.violet : colors.textTertiary}
            accessibilityLabel="Make playlist public"
          />
        </View>
        {error ? (
          <AppText variant="small" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <Button
          label={saving ? 'Creating…' : 'Create playlist'}
          onPress={() => void handleCreate()}
          loading={saving}
          disabled={saving}
          fullWidth
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
});
