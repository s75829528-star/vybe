import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage } from '@/lib/errors';
import { updatePlaylist } from '@/services/playlists';
import { toast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme';
import type { Playlist } from '@/types/database';

type Props = {
  visible: boolean;
  playlist: Playlist;
  onClose: () => void;
  onUpdated: (playlist: Playlist) => void;
};

export function EditPlaylistSheet({ visible, playlist, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description ?? '');
  const [isPublic, setIsPublic] = useState(playlist.is_public);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(playlist.title);
      setDescription(playlist.description ?? '');
      setIsPublic(playlist.is_public);
      setError(null);
      setSaving(false);
    }
  }, [playlist, visible]);

  const handleSave = async () => {
    if (saving) return;
    if (!title.trim()) {
      setError('Give your playlist a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePlaylist(playlist.id, {
        title,
        description,
        isPublic,
      });
      toast.success('Playlist updated');
      onUpdated(updated);
      onClose();
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'The playlist could not be updated.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit playlist" maxHeight="80%">
      <View style={styles.body}>
        <TextField
          label="Name"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (error) setError(null);
          }}
          maxLength={120}
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={400}
          placeholder="What is this playlist about?"
        />
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <AppText variant="bodyBold">Public playlist</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Public playlists can appear on Home and in search.
            </AppText>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ true: colors.primaryDeep, false: colors.surfaceHigh }}
            thumbColor={isPublic ? colors.violet : colors.textTertiary}
            accessibilityLabel="Public playlist"
          />
        </View>
        {error ? (
          <AppText variant="small" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        <Button
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={() => void handleSave()}
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
