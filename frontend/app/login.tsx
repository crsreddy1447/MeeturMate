import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={44} color="#FF5F6D" />
          </View>
          <Text style={styles.brand}>MeeturMate</Text>
          <Text style={styles.tagline}>Where connections become stories</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#636370" style={styles.inputIcon} />
            <TextInput
              testID="login-email-input"
              style={styles.input}
              placeholder="hello@example.com"
              placeholderTextColor="#636370"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#636370" style={styles.inputIcon} />
            <TextInput
              testID="login-password-input"
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor="#636370"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity testID="toggle-password" onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#636370" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="login-submit-button"
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="go-to-register"
            style={styles.secondaryBtn}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.secondaryBtnText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1C1C24',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brand: { fontSize: 36, fontWeight: '800', color: '#FDFDFD', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#A0A0AB', marginTop: 6 },
  form: { width: '100%' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#A0A0AB', marginBottom: 8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#1C1C24',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#32323D',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FDFDFD', fontSize: 16 },
  primaryBtn: {
    height: 56,
    backgroundColor: '#FF5F6D',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FDFDFD', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    height: 56,
    backgroundColor: '#2A2A35',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryBtnText: { color: '#FDFDFD', fontSize: 16, fontWeight: '700' },
});
