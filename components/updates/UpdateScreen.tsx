import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import * as Updates from 'expo-updates';
import { Colors, Typography, Spacing } from '../../constants/theme';

const { width } = Dimensions.get('window');

type UpdatePhase =
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'upToDate'
  | 'idle';

interface Props {
  onComplete: () => void;
}

export default function UpdateScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<UpdatePhase>('checking');
  const [statusText, setStatusText] = useState('Checking for updates…');
  const [errorMsg, setErrorMsg] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation
  const entranceScale = useRef(new Animated.Value(0.3)).current;
  const entranceFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;

  // Entrance animation — plays once on mount
  useEffect(() => {
    Animated.sequence([
      // 1. Logo scales up and fades in
      Animated.parallel([
        Animated.spring(entranceScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(entranceFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 2. Tagline fades in after logo lands
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Gold glow pulse on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const animateProgress = (toValue: number, duration = 800) =>
    new Promise<void>((resolve) =>
      Animated.timing(progressAnim, {
        toValue,
        duration,
        useNativeDriver: false,
      }).start(() => resolve())
    );

  const fadeOut = () =>
    new Promise<void>((resolve) =>
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(
        () => resolve()
      )
    );

  useEffect(() => {
    runUpdateCheck();
  }, []);

  const runUpdateCheck = async () => {
    // Skip update check when:
    // - In development (__DEV__)
    // - Running in Expo Go (updates disabled in app.json)
    // - expo-updates is not enabled
    const updatesEnabled = Updates.isEnabled;
    if (__DEV__ || !updatesEnabled) {
      await animateProgress(1, 600);
      setTimeout(onComplete, 500);
      return;
    }

    try {
      // Phase 1: check
      setPhase('checking');
      setStatusText('Checking for updates…');
      await animateProgress(0.25, 500);

      const check = await Updates.checkForUpdateAsync();

      if (!check.isAvailable) {
        setPhase('upToDate');
        setStatusText('You\'re on the latest version ✨');
        await animateProgress(1, 600);
        await fadeOut();
        onComplete();
        return;
      }

      // Phase 2: download
      setPhase('downloading');
      setStatusText('Downloading update…');
      await animateProgress(0.5, 300);

      await Updates.fetchUpdateAsync();
      await animateProgress(0.85, 600);

      // Phase 3: ready — DO NOT call reloadAsync() here.
      // reloadAsync() restarts the native bridge mid-session and causes
      // a "keeps stopping" crash. The downloaded bundle will be used
      // automatically on the next natural app launch.
      setPhase('ready');
      setStatusText('Update ready! Launching…');
      await animateProgress(1, 500);
      await fadeOut();
      onComplete();
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e?.message || 'Update check failed');
      setStatusText('Continuing with cached version…');
      await animateProgress(1, 400);
      await fadeOut();
      onComplete();
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 80],
  });

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.6)'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Background gradient dots */}
      <View style={styles.bgDot1} />
      <View style={styles.bgDot2} />

      {/* Logo */}
      <Animated.View style={[
        styles.logoContainer,
        {
          transform: [
            { scale: Animated.multiply(pulseAnim, entranceScale) },
          ],
          opacity: entranceFade,
        }
      ]}>
        <Animated.View style={[styles.logoGlow, { backgroundColor: glowColor }]} />
        <Text style={styles.logoText}>MODY</Text>
        <Text style={styles.logoAccent}>SOLE</Text>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>Snap. Swap. Step.</Animated.Text>

      {/* Progress area */}
      <View style={styles.progressSection}>
        <Text style={styles.statusText}>{statusText}</Text>

        {phase === 'error' && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {/* Track */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
            <View style={styles.progressGlow} />
          </Animated.View>
        </View>

        {/* Phase dots */}
        <View style={styles.phaseDots}>
          {(['checking', 'downloading', 'ready'] as UpdatePhase[]).map((p, i) => (
            <View
              key={p}
              style={[
                styles.dot,
                (phase === p ||
                  (i === 0 && phase !== 'idle') ||
                  (i === 1 && (phase === 'downloading' || phase === 'ready')) ||
                  (i === 2 && phase === 'ready')) &&
                  styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.versionText}>v{require('../../package.json').version}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  bgDot1: {
    position: 'absolute',
    top: '20%',
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,215,0,0.04)',
  },
  bgDot2: {
    position: 'absolute',
    bottom: '15%',
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,215,0,0.03)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -30,
    right: -30,
    bottom: -20,
    borderRadius: 30,
  },
  logoText: {
    fontFamily: Typography.fontHeadingBold,
    fontSize: 52,
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  logoAccent: {
    fontFamily: Typography.fontHeadingBold,
    fontSize: 52,
    color: Colors.gold,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: Spacing['5xl'],
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.fontBody,
    fontSize: Typography.xs,
    color: Colors.error,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  progressTrack: {
    width: width - 80,
    height: 3,
    backgroundColor: Colors.surface2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 2,
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    top: -4,
    right: 0,
    width: 20,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.gold,
    opacity: 0.7,
  },
  phaseDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface3,
  },
  dotActive: {
    backgroundColor: Colors.gold,
  },
  versionText: {
    position: 'absolute',
    bottom: 40,
    fontFamily: Typography.fontBody,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
