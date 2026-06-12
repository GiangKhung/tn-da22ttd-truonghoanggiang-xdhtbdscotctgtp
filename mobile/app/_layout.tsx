import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Guard: redirect dựa trên auth state
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (state.status === 'loading') return;

    const inLoginScreen = segments[0] === 'login';

    if (state.status === 'unauthenticated' && !inLoginScreen) {
      router.replace('/login');
    } else if (state.status === 'authenticated' && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [state.status, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
    []
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <AuthGuard>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="booking/success"
                  options={{ presentation: 'modal', title: 'Đặt lịch thành công' }}
                />
              </Stack>
            </AuthGuard>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
