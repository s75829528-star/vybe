import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { toast } from '@/stores/toastStore';
import { colors } from '@/theme';

type Props = {
  songId: string;
  size?: number;
  buttonSize?: number;
  filledBackground?: boolean;
};

export function LikeButton({ songId, size = 20, buttonSize = 40, filledBackground = false }: Props) {
  const liked = useLibraryStore((state) => Boolean(state.liked[songId]));
  const pending = useLibraryStore((state) => Boolean(state.pending[`like:${songId}`]));
  const session = useAuthStore((state) => state.session);
  const toggleLike = useLibraryStore((state) => state.toggleLike);

  return (
    <Pressable
      onPress={() => {
        if (!session) {
          toast.info('Sign in to save songs to your library.');
          return;
        }
        void toggleLike(songId).catch(() => undefined);
      }}
      disabled={pending}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Remove from liked songs' : 'Like song'}
      accessibilityState={{ selected: liked, disabled: pending }}
      style={({ pressed }) => [
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: filledBackground ? colors.surfaceHigh : 'transparent',
          opacity: pending ? 0.55 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={size}
        color={liked ? colors.primary : colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
