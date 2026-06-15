import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../lib/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../lib/store/authStore';

const INVITE_VERIFIED_KEY = 'modysole_invite_verified';

export default function InviteGateScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'success'>('idle');
  const router = useRouter();
  const setHasInvite = useAuthStore(s => s.setHasInvite);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    if (!code.trim()) { shake(); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/invite/verify', { code: code.trim() });
      if (data.valid) {
        setPhase('success');
        // Store verification locally so they don't need to enter again
        await AsyncStorage.setItem(INVITE_VERIFIED_KEY, code.trim().toUpperCase());
        setHasInvite(true); // Update global state
        setTimeout(() => router.replace('/(auth)/login'), 1200);
      }
    } catch (e: any) {
      shake();
      Alert.alert(
        'Access Denied',
        e?.response?.data?.error || 'Invalid invite code. Contact the ModySOLE team.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0.05)', 'rgba(255,215,0,0.15)'],
  });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#000000', '#050500', '#000000']} style={StyleSheet.absoluteFill} />

      {/* Glow blob */}
      <Animated.View style={[styles.glowBlob, { backgroundColor: glowColor }]} />

      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

        {phase === 'success' ? (
          // ── Success state ──
          <View style={styles.successState}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.gold} />
            <Text style={styles.successTitle}>Access Granted</Text>
            <Text style={styles.successText}>Welcome to ModySOLE</Text>
          </View>
        ) : (
          // ── Invite gate ──
          <>
            {/* Logo */}
            <View style={styles.logoRow}>
              <Text style={styles.logoBlack}>MODY</Text>
              <Text style={styles.logoGold}>SOLE</Text>
            </View>
            <View style={styles.lockIcon}>
              <Ionicons name="lock-closed" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.title}>Private Access</Text>
            <Text style={styles.subtitle}>
              ModySOLE is currently invite-only.{'\n'}Enter your invite code to continue.
            </Text>

            {/* Code input */}
            <Animated.View style={[styles.inputWrap, { transform: [{ translateX: shakeAnim }] }]}>
              <Ionicons name="key-outline" size={20} color={Colors.gold} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { letterSpacing: 3 }]}
                placeholder="MODY-XXXXXX"
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={handleVerify}
              />
            </Animated.View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={Colors.gradientGold}
                style={styles.submitGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color={Colors.black} />
                  : <>
                      <Ionicons name="arrow-forward-circle" size={20} color={Colors.black} />
                      <Text style={styles.submitText}>Verify Access</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footer}>
              Don't have a code?{' '}
              <Text style={{ color: Colors.gold }}>Contact @modysole</Text>
            </Text>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  glowBlob: {
    position: 'absolute', top: '30%', left: '10%',
    width: '80%', height: '40%', borderRadius: 200,
  },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoRow: { flexDirection: 'row', marginBottom: Spacing.md },
  logoBlack: { fontFamily: Typography.fontHeadingBold, fontSize: 40, color: Colors.textPrimary, letterSpacing: 4 },
  logoGold: { fontFamily: Typography.fontHeadingBold, fontSize: 40, color: Colors.gold, letterSpacing: 4 },
  lockIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.gold + '15',
    borderWidth: 1, borderColor: Colors.gold + '30',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.fontHeading, fontSize: Typography['2xl'],
    color: Colors.textPrimary, marginBottom: 8,
  },
  subtitle: {
    fontFamily: Typography.fontBody, fontSize: Typography.base,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.borderGold,
    paddingHorizontal: 16, width: '100%',
    marginBottom: Spacing.base,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1, paddingVertical: 16,
    fontFamily: Typography.fontBodyBold,
    fontSize: Typography.md, color: Colors.gold,
    letterSpacing: 3,
  },
  submitBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl },
  submitGrad: {
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  submitText: { fontFamily: Typography.fontBodyBold, fontSize: Typography.base, color: Colors.black },
  footer: { fontFamily: Typography.fontBody, fontSize: Typography.sm, color: Colors.textMuted },
  // Success
  successState: { alignItems: 'center', gap: 16 },
  successTitle: { fontFamily: Typography.fontHeadingBold, fontSize: Typography['2xl'], color: Colors.gold },
  successText: { fontFamily: Typography.fontBody, fontSize: Typography.base, color: Colors.textSecondary },
});
