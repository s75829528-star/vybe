import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme';

export default function Index() {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);

  if (!initialized || status === 'idle' || status === 'initializing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.violet} size="large" />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
