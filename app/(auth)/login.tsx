import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../lib/store/authStore';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, enterGuestMode } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e?.response?.data?.error || 'Check your credentials');
    } finally { setLoading(false); }
  };

  const handleBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) { Alert.alert('Not supported', 'Biometric not available on this device'); return; }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      // In prod: fetch stored credentials from secure store
      Alert.alert('Biometric OK', 'In production, this would retrieve your saved credentials.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#000000', '#0A0A00']} style={StyleSheet.absoluteFill} />

      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoBlack}>MODY</Text>
          <Text style={styles.logoGold}>SOLE</Text>
        </View>
        <Text style={styles.tagline}>SNAP. SWAP. STEP.</Text>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to your account</Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientGold} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading
              ? <ActivityIndicator color={Colors.black} />
              : <Text style={styles.loginText}>Sign In</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Biometric */}
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
          <Ionicons name="finger-print-outline" size={22} color={Colors.gold} />
          <Text style={styles.biometricText}>Use Biometrics</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>or</Text><View style={styles.line} /></View>

        {/* Guest */}
        <TouchableOpacity style={styles.guestBtn} onPress={() => { enterGuestMode(); }}>
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>

        {/* Signup link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupLabel}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40 },
  blob1: { position: 'absolute', top: -60, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,215,0,0.06)' },
  blob2: { position: 'absolute', bottom: 100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,215,0,0.03)' },
  logoRow: { flexDirection: 'row', marginBottom: 4 },
  logoBlack: { fontFamily: Typography.fontHeadingBold, fontSize: 36, color: Colors.textPrimary, letterSpacing: 3 },
  logoGold: { fontFamily: Typography.fontHeadingBold, fontSize: 36, color: Colors.gold, letterSpacing: 3 },
  tagline: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.textMuted, letterSpacing: 4, marginBottom: Spacing['4xl'] },
  heading: { fontFamily: Typography.fontHeading, fontSize: Typography['2xl'], color: Colors.textPrimary, marginBottom: 4 },
  subheading: { fontFamily: Typography.fontBody, fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.xl },
  field: { marginBottom: Spacing.base },
  label: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontFamily: Typography.fontBody, fontSize: Typography.base, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },
  loginBtn: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  loginGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: BorderRadius.lg },
  loginText: { fontFamily: Typography.fontBodyBold, fontSize: Typography.base, color: Colors.black, letterSpacing: 0.5 },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.base, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderGold },
  biometricText: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.sm, color: Colors.gold },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  or: { marginHorizontal: 12, fontFamily: Typography.fontBody, fontSize: Typography.sm, color: Colors.textMuted },
  guestBtn: { paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  guestText: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.base, color: Colors.textSecondary },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  signupLabel: { fontFamily: Typography.fontBody, fontSize: Typography.sm, color: Colors.textSecondary },
  signupLink: { fontFamily: Typography.fontBodyBold, fontSize: Typography.sm, color: Colors.gold },
});
