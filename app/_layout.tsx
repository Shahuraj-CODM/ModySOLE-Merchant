import React, { useEffect, useState } from 'react';
import { View, StatusBar, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../lib/store/authStore';
import UpdateScreen from '../components/updates/UpdateScreen';
import OnboardingSlides, { ONBOARDING_KEY } from '../components/onboarding/OnboardingSlides';
import { Colors } from '../constants/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

// ── Invite + Auth guard ───────────────────────────────────────
interface AppGuardProps {
  children: React.ReactNode;
  onboardingDone: boolean;
}

function AppGuard({ children, onboardingDone }: AppGuardProps) {
  const { user, isLoading, restore, hasInvite } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const redirectTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { restore(); }, []);

  useEffect(() => {
    // Don't redirect while onboarding overlay is still covering the screen
    if (!onboardingDone) return;
    // Navigation not ready yet
    if (!rootNavigationState?.key) return;
    // Auth state still loading
    if (isLoading) return;

    if (redirectTimer.current) clearTimeout(redirectTimer.current);

    redirectTimer.current = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      const onInviteScreen = inAuthGroup && segments[1] === 'invite';

      if (!hasInvite) {
        if (!onInviteScreen) router.replace('/(auth)/invite');
        return;
      }

      if (!user) {
        if (!inAuthGroup) router.replace('/(auth)/login');
        return;
      }

      if (user.role !== 'admin') {
        Alert.alert('Access Denied', 'Only administrators are allowed to access the Merchant Portal.');
        useAuthStore.getState().logout();
        router.replace('/(auth)/login');
        return;
      }

      if (inAuthGroup) {
        router.replace('/admin-orders');
      }
    }, 150);

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [user, isLoading, segments, hasInvite, rootNavigationState?.key, onboardingDone]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          Montserrat_600SemiBold,
          Montserrat_700Bold,
          Montserrat_800ExtraBold,
        });
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDone(!!done);
        setShowUpdate(true);
      } catch (e) {
        // On error, still proceed so we don't leave user on blank screen
        setOnboardingDone(true);
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  const handleUpdateComplete = async () => {
    setShowUpdate(false);
    setAppReady(true);
    await SplashScreen.hideAsync();
  };

  // ── Phase 1: Still loading fonts / checking storage ──────────
  if (!showUpdate && !appReady) {
    return null;
  }

  // ── Phase 2: Fonts ready, show update screen ─────────────────
  if (showUpdate && !appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary }}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
        <UpdateScreen onComplete={handleUpdateComplete} />
      </View>
    );
  }

  // ── Phase 3: App fully ready — Stack ALWAYS stays mounted ─────
  // Onboarding is an absolute overlay so the Stack (and its native
  // navigation bridge) is NEVER torn down or remounted mid-session.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
        <ErrorBoundary>
          <AppGuard onboardingDone={!!onboardingDone}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.bgPrimary },
              }}
            >
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="admin-orders" options={{ headerShown: false }} />
            </Stack>
          </AppGuard>
        </ErrorBoundary>

        {/* Onboarding overlay — sits on top of the already-mounted Stack.
            When dismissed, the Stack (which was running underneath) takes over.
            This prevents the native bridge crash from swapping the React tree. */}
        {onboardingDone === false && (
          <View style={[StyleSheet.absoluteFill, styles.onboardingOverlay]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <OnboardingSlides onDone={() => setOnboardingDone(true)} />
          </View>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  onboardingOverlay: {
    zIndex: 999,
    backgroundColor: '#000',
  },
});
