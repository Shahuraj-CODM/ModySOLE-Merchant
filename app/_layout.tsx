import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, StyleSheet, Alert } from 'react-native';
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

function isOperationalHourIST() {
  if (__DEV__) return true; // Bypass for development testing
  const now = new Date();
  // Shift UTC to IST (UTC + 5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffsetMs);
  
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  // 8:00 AM = 480 minutes
  // 12:00 PM = 720 minutes
  // 1:00 PM = 780 minutes
  // 9:00 PM = 1260 minutes
  const isMorningShift = (currentMinutes >= 480 && currentMinutes < 720);
  const isEveningShift = (currentMinutes >= 780 && currentMinutes < 1260);
  
  return isMorningShift || isEveningShift;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [isOperational, setIsOperational] = useState(isOperationalHourIST());

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
        setAppReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        // On error, still proceed so we don't leave user on blank screen
        setOnboardingDone(true);
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  // Background update check — runs after the app is mounted and ready
  useEffect(() => {
    if (appReady) {
      const runBackgroundUpdate = async () => {
        if (__DEV__ || !Updates.isEnabled) return;
        try {
          const check = await Updates.checkForUpdateAsync();
          if (check.isAvailable) {
            await Updates.fetchUpdateAsync();
            console.log('[Updates] Background update downloaded successfully.');
          }
        } catch (e) {
          console.warn('[Updates] Background update check failed:', e);
        }
      };
      // Delay background update check to prioritize main screen rendering and interactions
      const timer = setTimeout(runBackgroundUpdate, 2000);
      return () => clearTimeout(timer);
    }
  }, [appReady]);

  // Periodic operational hours checker
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOperational(isOperationalHourIST());
    }, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // ── Phase 1: Still loading fonts / checking storage ──────────
  if (!appReady || onboardingDone === null) {
    return null;
  }

  // ── Operational Hours Lock Screen ────────────────────────────
  if (!isOperational) {
    return (
      <View style={styles.closedContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.closedCard}>
          <Text style={styles.closedEmoji}>⏰</Text>
          <Text style={styles.closedTitle}>Merchant Portal Closed</Text>
          <Text style={styles.closedText}>
            The Merchant Portal is only accessible during operating hours:
          </Text>
          <View style={styles.timeBlock}>
            <Text style={styles.timeText}>🌅 Morning: 08:00 AM - 12:00 PM IST</Text>
            <Text style={styles.timeText}>🌆 Evening: 01:00 PM - 09:00 PM IST</Text>
          </View>
          <Text style={styles.closedFooter}>Currently Outside Shift Hours</Text>
        </View>
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
  closedContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  closedCard: {
    width: '100%',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#FFD70030',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  closedEmoji: {
    fontSize: 50,
    marginBottom: 20,
  },
  closedTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  closedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  timeBlock: {
    width: '100%',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    gap: 12,
  },
  timeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
  },
  closedFooter: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
