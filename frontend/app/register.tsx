import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

const GENDERS = ['male', 'female', 'other'];

export default function Register() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', name: '', age: '', gender: 'male', bio: '', location: '' });
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm({ ...form, [key]: val });

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.name || !form.age) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      await register({ ...form, age: parseInt(form.age) });
      router.replace('/questionnaire');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity testID="register-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
        </TouchableOpacity>

        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.sub}>Join MeeturMate and find your match</Text>

        <Text style={styles.label}>FULL NAME *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#636370" style={styles.ico} />
          <TextInput testID="register-name" style={styles.input} placeholder="Your name" placeholderTextColor="#636370" value={form.name} onChangeText={(t) => update('name', t)} />
        </View>

        <Text style={styles.label}>EMAIL *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#636370" style={styles.ico} />
          <TextInput testID="register-email" style={styles.input} placeholder="hello@example.com" placeholderTextColor="#636370" value={form.email} onChangeText={(t) => update('email', t)} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <Text style={styles.label}>PASSWORD *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#636370" style={styles.ico} />
          <TextInput testID="register-password" style={styles.input} placeholder="Min 6 characters" placeholderTextColor="#636370" value={form.password} onChangeText={(t) => update('password', t)} secureTextEntry />
        </View>

        <Text style={styles.label}>AGE *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="calendar-outline" size={18} color="#636370" style={styles.ico} />
          <TextInput testID="register-age" style={styles.input} placeholder="Your age" placeholderTextColor="#636370" value={form.age} onChangeText={(t) => update('age', t)} keyboardType="number-pad" />
        </View>

        <Text style={styles.label}>GENDER *</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              testID={`gender-${g}`}
              key={g}
              style={[styles.genderPill, form.gender === g && styles.genderActive]}
              onPress={() => update('gender', g)}
            >
              <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>LOCATION</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="location-outline" size={18} color="#636370" style={styles.ico} />
          <TextInput testID="register-location" style={styles.input} placeholder="City, Country" placeholderTextColor="#636370" value={form.location} onChangeText={(t) => update('location', t)} />
        </View>

        <Text style={styles.label}>BIO</Text>
        <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 14 }]}>
          <TextInput testID="register-bio" style={[styles.input, { textAlignVertical: 'top' }]} placeholder="Tell us about yourself" placeholderTextColor="#636370" value={form.bio} onChangeText={(t) => update('bio', t)} multiline numberOfLines={3} />
        </View>

        <TouchableOpacity testID="register-submit-button" style={[styles.primaryBtn, loading && styles.btnOff]} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="go-to-login" style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  scroll: { padding: 24, paddingTop: 56 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  heading: { fontSize: 36, fontWeight: '800', color: '#FDFDFD', letterSpacing: -1, marginTop: 8 },
  sub: { fontSize: 16, color: '#A0A0AB', marginTop: 4, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#A0A0AB', marginBottom: 8, marginTop: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 56, backgroundColor: '#1C1C24', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#32323D' },
  ico: { marginRight: 12 },
  input: { flex: 1, color: '#FDFDFD', fontSize: 16 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderPill: { flex: 1, height: 48, borderRadius: 9999, backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#32323D' },
  genderActive: { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' },
  genderText: { fontSize: 14, fontWeight: '600', color: '#A0A0AB' },
  genderTextActive: { color: '#FDFDFD' },
  primaryBtn: { height: 56, backgroundColor: '#FF5F6D', borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  btnOff: { opacity: 0.5 },
  primaryBtnText: { color: '#FDFDFD', fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  linkText: { fontSize: 14, color: '#A0A0AB' },
  linkAccent: { color: '#FF5F6D', fontWeight: '700' },
});
