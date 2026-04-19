import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      router.replace('/(tabs)/matches');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isWeb && (
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={styles.logoWrap}>
            <Ionicons name="flame" size={48} color="#1877F2" />
          </View>
          <Text style={styles.brand}>MeeturMate</Text>
          <Text style={styles.tagline}>Swipe. Match. Connect.</Text>
        </View>
      )}
      <LinearGradient
        colors={['#FF5F6D', '#FF8A5C', '#FFC371']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientTop}
      >
        <View style={[styles.heroContent, { paddingTop: insets.top + 40 }]}>
          <View style={styles.logoWrap}>
            <Ionicons name="flame" size={48} color="#fff" />
          </View>
          <Text style={styles.brand}>MeeturMate</Text>
          <Text style={styles.tagline}>Swipe. Match. Connect.</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.welcomeBack}>Welcome back</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                testID="login-email-input"
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                testID="login-password-input"
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity testID="toggle-password" onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#999" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF5F6D', '#FFC371']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Signing in...' : 'Log In'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              testID="go-to-register"
              style={styles.secondaryBtn}
              onPress={() => router.push('/register')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Create new account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12', ...(isWeb ? { alignItems: 'center', justifyContent: 'center' } : {}) },
  gradientTop: { paddingBottom: 50, ...(isWeb ? { display: 'none' } : {}) },
  heroContent: { alignItems: 'center', paddingBottom: 40 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: isWeb ? '#E7F3FF' : 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brand: { fontSize: 32, fontWeight: '800', color: isWeb ? '#1877F2' : '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: isWeb ? '#65676B' : 'rgba(255,255,255,0.85)', marginTop: 6, fontWeight: '500' },
  formContainer: { flex: isWeb ? 0 : 1, marginTop: isWeb ? 0 : -30, ...(isWeb ? { width: 420, maxWidth: '90%' } : {}) },
  scroll: { flexGrow: isWeb ? 0 : 1 },
  formCard: {
    flex: isWeb ? 0 : 1,
    backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12',
    borderTopLeftRadius: isWeb ? 16 : 30, borderTopRightRadius: isWeb ? 16 : 30,
    borderBottomLeftRadius: isWeb ? 16 : 0, borderBottomRightRadius: isWeb ? 16 : 0,
    paddingHorizontal: 24, paddingTop: 36, paddingBottom: 40,
    ...(isWeb ? {
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
      borderWidth: 1, borderColor: '#E4E6EB',
    } : {}),
  },
  welcomeBack: { fontSize: 26, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 28, letterSpacing: -0.3, ...(isWeb ? { textAlign: 'center' } : {}) },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 56,
    backgroundColor: isWeb ? '#F0F2F5' : '#1A1A24', borderRadius: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: isWeb ? '#CED0D4' : '#2A2A35', marginBottom: 14,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: isWeb ? '#1C1E21' : '#FDFDFD', fontSize: 16, ...(isWeb ? { outlineStyle: 'none' as any } : {}) },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 14, color: isWeb ? '#1877F2' : '#FF5F6D', fontWeight: '600' },
  primaryBtn: { borderRadius: 9999, overflow: 'hidden', marginBottom: 20 },
  btnDisabled: { opacity: 0.5 },
  gradientBtn: {
    height: 56, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    ...(isWeb ? { backgroundColor: '#1877F2' } : {}),
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: isWeb ? '#CED0D4' : '#2A2A35' },
  dividerText: { paddingHorizontal: 16, fontSize: 13, color: isWeb ? '#65676B' : '#636370', fontWeight: '600' },
  secondaryBtn: {
    height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: isWeb ? '#1877F2' : '#FF5F6D',
  },
  secondaryBtnText: { color: isWeb ? '#1877F2' : '#FF5F6D', fontSize: 16, fontWeight: '700' },
});
