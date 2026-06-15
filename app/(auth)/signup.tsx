import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../lib/store/authStore';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    AsyncStorage.getItem('modysole_invite_verified').then(val => {
      if (val) setInviteCode(val);
    });
  }, []);

  const sendOtp = async () => {
    if (!phone || phone.length < 10) { Alert.alert('Error', 'Enter a valid phone number'); return; }
    setLoading(true);
    try {
      // Mock: any phone gets OTP 123456
      await new Promise(r => setTimeout(r, 800));
      setOtpSent(true);
      Alert.alert('OTP Sent', 'Your OTP is 123456 (mock)');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp !== '123456') { Alert.alert('Error', 'Invalid OTP. Use 123456'); return; }
    setOtpVerified(true);
    Alert.alert('Verified ✓', 'Phone number verified!');
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !inviteCode) { Alert.alert('Error', 'All fields required, including Invite Code'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, phone || undefined, inviteCode.trim().toUpperCase());
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.response?.data?.error || 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#000000', '#0A0A00']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Join the ModySOLE community</Text>

        {[
          { label: 'Invite Code', icon: 'key-outline', val: inviteCode, set: setInviteCode, placeholder: 'MODY-XXXXXX', keyboard: 'default' as any, readOnly: false },
          { label: 'Full Name', icon: 'person-outline', val: name, set: setName, placeholder: 'Your name', keyboard: 'default' as any, readOnly: false },
          { label: 'Email', icon: 'mail-outline', val: email, set: setEmail, placeholder: 'you@example.com', keyboard: 'email-address' as any, readOnly: false },
          { label: 'Password', icon: 'lock-closed-outline', val: password, set: setPassword, placeholder: '••••••••', secure: true, keyboard: 'default' as any, readOnly: false },
        ].map((f) => (
          <View style={styles.field} key={f.label}>
            <Text style={styles.label}>{f.label}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name={f.icon as any} size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={f.secure && !showPw}
                keyboardType={f.keyboard}
                autoCapitalize="none"
                value={f.val}
                onChangeText={f.set}
                editable={!f.readOnly}
              />
              {f.secure && (
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Phone + OTP */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone (Optional)</Text>
          <View style={styles.phoneRow}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Ionicons name="call-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <TouchableOpacity style={styles.otpSendBtn} onPress={sendOtp} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.otpSendText}>{otpSent ? 'Resend' : 'Send OTP'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {otpSent && !otpVerified && (
          <View style={styles.field}>
            <Text style={styles.label}>Enter OTP</Text>
            <View style={styles.phoneRow}>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Ionicons name="keypad-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="123456" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={6} />
              </View>
              <TouchableOpacity style={styles.otpSendBtn} onPress={verifyOtp}><Text style={styles.otpSendText}>Verify</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {otpVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.verifiedText}>Phone verified</Text>
          </View>
        )}

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientGold} style={styles.registerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.registerText}>Create Account</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginLabel}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.loginLink}>Sign In</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  blob1: { position: 'absolute', top: -60, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,215,0,0.05)' },
  backBtn: { marginBottom: Spacing['2xl'] },
  heading: { fontFamily: Typography.fontHeading, fontSize: Typography['2xl'], color: Colors.textPrimary, marginBottom: 4 },
  subheading: { fontFamily: Typography.fontBody, fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.xl },
  field: { marginBottom: Spacing.base },
  label: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { paddingVertical: 14, fontFamily: Typography.fontBody, fontSize: Typography.base, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  otpSendBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingHorizontal: 14, justifyContent: 'center' },
  otpSendText: { fontFamily: Typography.fontBodyBold, fontSize: Typography.xs, color: Colors.black },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.base },
  verifiedText: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.sm, color: Colors.success },
  registerBtn: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  registerGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: BorderRadius.lg },
  registerText: { fontFamily: Typography.fontBodyBold, fontSize: Typography.base, color: Colors.black },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  loginLabel: { fontFamily: Typography.fontBody, fontSize: Typography.sm, color: Colors.textSecondary },
  loginLink: { fontFamily: Typography.fontBodyBold, fontSize: Typography.sm, color: Colors.gold },
});
