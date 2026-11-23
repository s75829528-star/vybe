import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage } from '@/lib/errors';
import { env } from '@/lib/env';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { toast } from '@/stores/toastStore';
import { colors, radii, spacing } from '@/theme';

function hostFromUrl(url: string): string {
  if (!url) return 'Not configured';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function SettingRow({
  icon,
  title,
  description,
  value,
  onPress,
  trailing,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, destructive && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.violet} />
      </View>
      <View style={styles.rowCopy}>
        <AppText variant="bodyBold" color={destructive ? colors.danger : colors.text}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color={colors.textSecondary} style={styles.rowDescription}>
            {description}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="small" color={colors.textTertiary}>
          {value}
        </AppText>
      ) : null}
      {trailing ??
        (onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} /> : null)}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => pressed && styles.rowPressed}
    >
      {content}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color={colors.textTertiary} style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const signOut = useAuthStore((state) => state.signOut);
  const updateDisplayName = useAuthStore((state) => state.updateDisplayName);

  const backgroundPlayback = usePreferencesStore((state) => state.backgroundPlayback);
  const resumeOnLaunch = usePreferencesStore((state) => state.resumeOnLaunch);
  const haptics = usePreferencesStore((state) => state.haptics);
  const setBackgroundPlayback = usePreferencesStore((state) => state.setBackgroundPlayback);
  const setResumeOnLaunch = usePreferencesStore((state) => state.setResumeOnLaunch);
  const setHaptics = usePreferencesStore((state) => state.setHaptics);

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const openEdit = () => {
    setName(profile?.display_name ?? '');
    setNameError(null);
    setEditOpen(true);
  };

  const handleSaveName = async () => {
    if (savingName) return;
    setSavingName(true);
    setNameError(null);
    try {
      await updateDisplayName(name);
      toast.success('Display name updated');
      setEditOpen(false);
    } catch (error) {
      setNameError(getErrorMessage(error, 'Your name could not be updated.'));
    } finally {
      setSavingName(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your queue and downloads stay on this device. You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/(auth)/sign-in'));
        },
      },
    ]);
  };

  const clearQueue = () => {
    Alert.alert('Clear queue?', 'This stops playback and removes your current queue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void usePlayerStore.getState().clearQueue();
          toast.success('Queue cleared');
        },
      },
    ]);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.massive * 1.4,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText variant="h1">Settings</AppText>
          <AppText variant="small" color={colors.textSecondary}>
            Account, audio and app preferences
          </AppText>
        </View>

        <View style={styles.accountCard}>
          <Avatar name={profile?.display_name} size={58} />
          <View style={styles.accountCopy}>
            <AppText variant="h3" numberOfLines={1}>
              {profile?.display_name ?? 'Listener'}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {session?.user.email ?? 'Signed in'}
            </AppText>
            <View style={styles.badgeRow}>
              <Badge label={isAdmin ? 'Admin' : 'Listener'} tone={isAdmin ? 'primary' : 'neutral'} />
            </View>
          </View>
          <Pressable
            onPress={openEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit display name"
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {isAdmin ? (
          <Pressable
            onPress={() => router.push('/admin')}
            accessibilityRole="button"
            accessibilityLabel="Open admin tools"
            style={({ pressed }) => [styles.adminCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.adminIcon}>
              <Ionicons name="cloud-upload-outline" size={21} color={colors.violet} />
            </View>
            <View style={styles.adminCopy}>
              <AppText variant="bodyBold">Admin tools</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Upload, publish and manage the catalogue
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.violet} />
          </Pressable>
        ) : null}

        <Section title="Audio & playback">
          <SettingRow
            icon="phone-portrait-outline"
            title="Background playback"
            description="Keep audio playing when VYBE moves to the background."
            trailing={
              <Switch
                value={backgroundPlayback}
                onValueChange={setBackgroundPlayback}
                trackColor={{ true: colors.primaryDeep, false: colors.surfaceHigh }}
                thumbColor={backgroundPlayback ? colors.violet : colors.textTertiary}
                accessibilityLabel="Background playback"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="play-circle-outline"
            title="Resume on launch"
            description="Restore your queue and continue where you stopped."
            trailing={
              <Switch
                value={resumeOnLaunch}
                onValueChange={setResumeOnLaunch}
                trackColor={{ true: colors.primaryDeep, false: colors.surfaceHigh }}
                thumbColor={resumeOnLaunch ? colors.violet : colors.textTertiary}
                accessibilityLabel="Resume on launch"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="pulse-outline"
            title="Haptics"
            description="Subtle taps for likes, shuffle and other actions."
            trailing={
              <Switch
                value={haptics}
                onValueChange={setHaptics}
                trackColor={{ true: colors.primaryDeep, false: colors.surfaceHigh }}
                thumbColor={haptics ? colors.violet : colors.textTertiary}
                accessibilityLabel="Haptics"
              />
            }
          />
        </Section>

        <Section title="Storage">
          <SettingRow
            icon="cloud-download-outline"
            title="Offline downloads"
            description="Not available in this build. Streaming requires a connection."
            trailing={<Badge label="Placeholder" tone="warning" />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            title="Clear current queue"
            description="Removes the queue and saved playback position."
            onPress={clearQueue}
          />
        </Section>

        <Section title="App information">
          <SettingRow icon="information-circle-outline" title="Version" value={version} />
          <View style={styles.divider} />
          <SettingRow
            icon="server-outline"
            title="Supabase project"
            value={hostFromUrl(env.supabaseUrl)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="images-outline"
            title="Media CDN"
            value={env.cloudinaryCloudName || 'Cloudinary'}
          />
        </Section>

        <View style={styles.footer}>
          <Button label="Sign out" icon="log-out-outline" variant="danger" onPress={confirmSignOut} fullWidth />
          <AppText variant="caption" color={colors.textTertiary} style={styles.footerNote}>
            VYBE · Feel the music
          </AppText>
        </View>
      </ScrollView>

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Display name" maxHeight="60%">
        <View style={styles.sheetBody}>
          <TextField
            label="Name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (nameError) setNameError(null);
            }}
            placeholder="Your name"
            autoFocus
            maxLength={60}
            error={nameError}
          />
          <Button
            label={savingName ? 'Saving…' : 'Save name'}
            onPress={() => void handleSaveName()}
            loading={savingName}
            disabled={savingName}
            fullWidth
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  accountCopy: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    marginTop: spacing.xs,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(192,132,252,0.35)',
  },
  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCopy: {
    flex: 1,
    gap: 1,
  },
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowDescription: {
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxxl,
    gap: spacing.lg,
  },
  footerNote: {
    textAlign: 'center',
  },
  sheetBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
});
