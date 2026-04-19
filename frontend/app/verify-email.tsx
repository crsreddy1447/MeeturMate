import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

const OTP_LENGTH = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { sendOTP, verifyOTP } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (text: string, index: number) => {
    setError('');
    const newOtp = [...otp];
    // Handle paste of full OTP
    if (text.length > 1) {
      const chars = text.replace(/\D/g, '').split('').slice(0, OTP_LENGTH);
      chars.forEach((c, i) => (newOtp[i] = c));
      setOtp(newOtp);
      inputRefs.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    newOtp[index] = text.replace(/\D/g, '');
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyOTP(email || '', code);
      if (Platform.OS === 'web') {
        alert('Email verified successfully!');
      } else {
        Alert.alert('Success', 'Email verified successfully!');
      }
      router.replace('/questionnaire');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Invalid OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await sendOTP(email || '');
      setResendTimer(60);
      setError('');
    } catch (err: any) {
      setError('Failed to resend OTP. Try again.');
    }
  };

  const content = (
    <View style={[styles.card, isWeb && { maxWidth: 440, width: '100%' }]}>
      <View style={styles.iconCircle}>
        <Ionicons name="mail-outline" size={40} color="#A259FF" />
      </View>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit code to{'\n'}
        <Text style={styles.emailText}>{email || 'your email'}</Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => (inputRefs.current[i] = ref)}
            style={[styles.otpInput, error ? styles.otpInputError : null]}
            value={digit}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={i === 0 ? OTP_LENGTH : 1}
            selectTextOnFocus
            autoFocus={i === 0}
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.verifyBtn, loading && styles.btnDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.verifyBtnText}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </Text>
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't receive the code?</Text>
        <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
          <Text style={[styles.resendLink, resendTimer > 0 && styles.resendDisabled]}>
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace('/questionnaire')} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  if (isWeb) {
    return (
      <ScrollView contentContainerStyle={styles.webContainer}>
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webContainer: {
    flexGrow: 1,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Platform.OS === 'web' ? '#fff' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    padding: 32,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 }
      : {}),
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Platform.OS === 'web' ? '#F3EAFF' : 'rgba(162,89,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#1C1C1E' : '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Platform.OS === 'web' ? '#6B7280' : '#A0A0B0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emailText: {
    fontWeight: '600',
    color: Platform.OS === 'web' ? '#1877F2' : '#A259FF',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Platform.OS === 'web' ? '#D1D5DB' : '#2A2A3E',
    backgroundColor: Platform.OS === 'web' ? '#F9FAFB' : '#1A1A2E',
    color: Platform.OS === 'web' ? '#1C1C1E' : '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
  },
  verifyBtn: {
    width: '100%',
    backgroundColor: Platform.OS === 'web' ? '#1877F2' : '#A259FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  resendLabel: {
    fontSize: 14,
    color: Platform.OS === 'web' ? '#6B7280' : '#A0A0B0',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Platform.OS === 'web' ? '#1877F2' : '#A259FF',
  },
  resendDisabled: { opacity: 0.5 },
  skipBtn: { marginTop: 16 },
  skipText: {
    fontSize: 14,
    color: Platform.OS === 'web' ? '#9CA3AF' : '#6B7280',
  },
});
