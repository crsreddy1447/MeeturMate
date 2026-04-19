import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const GENDERS = [
  { key: 'female', label: 'Woman', icon: 'female' as const },
  { key: 'male', label: 'Man', icon: 'male' as const },
  { key: 'other', label: 'Other', icon: 'transgender' as const },
];

const ORIENTATIONS = [
  { key: 'straight', label: 'Straight', icon: 'male-female-outline' as const },
  { key: 'gay', label: 'Gay', icon: 'male-outline' as const },
  { key: 'lesbian', label: 'Lesbian', icon: 'female-outline' as const },
  { key: 'bisexual', label: 'Bisexual', icon: 'transgender-outline' as const },
  { key: 'open', label: 'Open to All', icon: 'heart-circle-outline' as const },
];

const CONNECTION_OPTIONS = [
  { key: 'friendship', label: 'Friendship', icon: 'people-outline' as const, desc: 'Find new friends' },
  { key: 'dating', label: 'Dating', icon: 'heart-outline' as const, desc: 'Find a partner' },
  { key: 'emotional', label: 'Emotional Connection', icon: 'chatbubble-ellipses-outline' as const, desc: 'Deep conversations' },
  { key: 'social', label: 'Social Networking', icon: 'globe-outline' as const, desc: 'Expand your circle' },
  { key: 'lifestyle', label: 'Lifestyle Companion', icon: 'cafe-outline' as const, desc: 'Share experiences' },
];

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: '', password: '', name: '', age: '', gender: 'female', bio: '', location: '',
    orientation: 'straight', connection_types: ['dating'] as string[],
  });
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const update = (key: string, val: string) => setForm({ ...form, [key]: val });
  const toggleConnectionType = (type: string) => {
    const current = form.connection_types;
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setForm({ ...form, connection_types: updated });
  };

  const animateStep = (next: number) => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      slideAnim.setValue(0);
    });
  };

  const nextStep = () => {
    if (step === 0 && (!form.name || !form.email || !form.password)) {
      Alert.alert('Required', 'Please fill in name, email and password');
      return;
    }
    if (step === 1 && !form.age) {
      Alert.alert('Required', 'Please enter your age');
      return;
    }
    animateStep(step + 1);
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      await register({
        ...form, age: parseInt(form.age),
        orientation: form.orientation,
        connection_types: form.connection_types,
      });
      router.replace('/questionnaire');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Let's get started</Text>
      <Text style={styles.stepSub}>Create your account</Text>

      <View style={styles.inputWrap}>
        <Ionicons name="person-outline" size={20} color="#999" style={styles.ico} />
        <TextInput testID="register-name" style={styles.input} placeholder="First name" placeholderTextColor="#666" value={form.name} onChangeText={(t) => update('name', t)} />
      </View>
      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={20} color="#999" style={styles.ico} />
        <TextInput testID="register-email" style={styles.input} placeholder="Email address" placeholderTextColor="#666" value={form.email} onChangeText={(t) => update('email', t)} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.ico} />
        <TextInput testID="register-password" style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor="#666" value={form.password} onChangeText={(t) => update('password', t)} secureTextEntry />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>About you</Text>
      <Text style={styles.stepSub}>Help us find your best matches</Text>

      <View style={styles.inputWrap}>
        <Ionicons name="calendar-outline" size={20} color="#999" style={styles.ico} />
        <TextInput testID="register-age" style={styles.input} placeholder="Your age" placeholderTextColor="#666" value={form.age} onChangeText={(t) => update('age', t)} keyboardType="number-pad" />
      </View>

      <Text style={styles.genderLabel}>I am a</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            testID={`gender-${g.key}`}
            key={g.key}
            style={[styles.genderCard, form.gender === g.key && styles.genderCardActive]}
            onPress={() => update('gender', g.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={g.icon} size={28} color={form.gender === g.key ? (isWeb ? '#1877F2' : '#FF5F6D') : '#636370'} />
            <Text style={[styles.genderText, form.gender === g.key && styles.genderTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Where are you?</Text>
      <Text style={styles.stepSub}>Find people nearby</Text>

      <View style={styles.inputWrap}>
        <Ionicons name="location-outline" size={20} color="#999" style={styles.ico} />
        <TextInput testID="register-location" style={styles.input} placeholder="City, Country" placeholderTextColor="#666" value={form.location} onChangeText={(t) => update('location', t)} />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your bio</Text>
      <Text style={styles.stepSub}>Make a great first impression</Text>

      <View style={[styles.inputWrap, styles.bioWrap]}>
        <TextInput testID="register-bio" style={[styles.input, styles.bioInput]} placeholder="Write something interesting about yourself..." placeholderTextColor="#666" value={form.bio} onChangeText={(t) => update('bio', t)} multiline numberOfLines={4} textAlignVertical="top" />
      </View>
      <Text style={styles.charCount}>{form.bio.length}/300</Text>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your orientation</Text>
      <Text style={styles.stepSub}>Who are you interested in?</Text>

      <View style={styles.genderRow}>
        {ORIENTATIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.genderCard, form.orientation === o.key && styles.genderCardActive]}
            onPress={() => update('orientation', o.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={o.icon} size={28} color={form.orientation === o.key ? (isWeb ? '#1877F2' : '#FF5F6D') : '#636370'} />
            <Text style={[styles.genderText, form.orientation === o.key && styles.genderTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What are you looking for?</Text>
      <Text style={styles.stepSub}>Select all that apply</Text>

      <View style={styles.connectionList}>
        {CONNECTION_OPTIONS.map((c) => {
          const selected = form.connection_types.includes(c.key);
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.connectionCard, selected && styles.connectionCardActive]}
              onPress={() => toggleConnectionType(c.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.connectionIcon, selected && styles.connectionIconActive]}>
                <Ionicons name={c.icon} size={24} color={selected ? '#fff' : '#636370'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.connectionLabel, selected && styles.connectionLabelActive]}>{c.label}</Text>
                <Text style={styles.connectionDesc}>{c.desc}</Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={22} color={isWeb ? '#1877F2' : '#FF5F6D'} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="register-back-btn" onPress={() => step > 0 ? animateStep(step - 1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isWeb ? '#1C1E21' : '#FDFDFD'} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepCounter}>{step + 1}/{totalSteps}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {steps[step]()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step < totalSteps - 1 ? (
            <TouchableOpacity style={styles.nextBtnWrap} onPress={nextStep} activeOpacity={0.85}>
              <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextBtnWrap, loading && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
                <Text style={styles.nextBtnText}>{loading ? 'Creating account...' : 'Start swiping'}</Text>
                <Ionicons name="heart" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {step === 0 && (
            <TouchableOpacity testID="go-to-login" style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkAccent}>Log In</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12', ...(isWeb ? { alignItems: 'center' } : {}) },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 14,
    ...(isWeb ? { width: 520, maxWidth: '100%' } : {}),
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  progressTrack: { flex: 1, height: 4, backgroundColor: isWeb ? '#CED0D4' : '#1C1C24', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: isWeb ? '#1877F2' : '#FF5F6D', borderRadius: 2 },
  stepCounter: { fontSize: 13, fontWeight: '600', color: isWeb ? '#65676B' : '#636370' },
  scroll: {
    flexGrow: 1, padding: 24,
    ...(isWeb ? { width: 520, maxWidth: '100%', alignSelf: 'center' as any } : {}),
  },
  stepContent: {
    ...(isWeb ? { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, borderWidth: 1, borderColor: '#E4E6EB',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 } : {}),
  },
  stepTitle: { fontSize: 32, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD', letterSpacing: -0.5, marginBottom: 6 },
  stepSub: { fontSize: 16, color: isWeb ? '#65676B' : '#A0A0AB', marginBottom: 32 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 56,
    backgroundColor: isWeb ? '#F0F2F5' : '#1A1A24', borderRadius: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: isWeb ? '#CED0D4' : '#2A2A35', marginBottom: 14,
  },
  ico: { marginRight: 12 },
  input: { flex: 1, color: isWeb ? '#1C1E21' : '#FDFDFD', fontSize: 16, ...(isWeb ? { outlineStyle: 'none' as any } : {}) },
  bioWrap: { height: 140, alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 },
  bioInput: { textAlignVertical: 'top', height: '100%' },
  charCount: { fontSize: 12, color: isWeb ? '#65676B' : '#636370', textAlign: 'right', marginTop: 4 },
  genderLabel: { fontSize: 16, fontWeight: '600', color: isWeb ? '#65676B' : '#A0A0AB', marginBottom: 14, marginTop: 8 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderCard: {
    flex: 1, paddingVertical: 24, borderRadius: 20,
    backgroundColor: isWeb ? '#F0F2F5' : '#1A1A24', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: isWeb ? '#CED0D4' : '#2A2A35', gap: 8,
  },
  genderCardActive: { borderColor: isWeb ? '#1877F2' : '#FF5F6D', backgroundColor: isWeb ? '#E7F3FF' : '#1A1420' },
  genderText: { fontSize: 14, fontWeight: '600', color: isWeb ? '#65676B' : '#636370' },
  genderTextActive: { color: isWeb ? '#1877F2' : '#FDFDFD' },
  footer: { paddingHorizontal: 24, paddingTop: 12, ...(isWeb ? { width: 520, maxWidth: '100%' } : {}) },
  nextBtnWrap: { borderRadius: 9999, overflow: 'hidden' },
  gradientBtn: {
    height: 56, borderRadius: 9999, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    ...(isWeb ? { backgroundColor: '#1877F2' } : {}),
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loginLink: { marginTop: 16, alignItems: 'center', paddingBottom: 8 },
  loginLinkText: { fontSize: 14, color: isWeb ? '#65676B' : '#A0A0AB' },
  loginLinkAccent: { color: isWeb ? '#1877F2' : '#FF5F6D', fontWeight: '700' },

  connectionList: { gap: 10 },
  connectionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16,
    backgroundColor: isWeb ? '#F0F2F5' : '#1A1A24',
    borderWidth: 2, borderColor: isWeb ? '#CED0D4' : '#2A2A35',
  },
  connectionCardActive: { borderColor: isWeb ? '#1877F2' : '#FF5F6D', backgroundColor: isWeb ? '#E7F3FF' : '#1A1420' },
  connectionIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: isWeb ? '#E4E6EB' : '#2A2A35', alignItems: 'center', justifyContent: 'center',
  },
  connectionIconActive: { backgroundColor: isWeb ? '#1877F2' : '#FF5F6D' },
  connectionLabel: { fontSize: 16, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  connectionLabelActive: { color: isWeb ? '#1877F2' : '#FF5F6D' },
  connectionDesc: { fontSize: 13, color: isWeb ? '#65676B' : '#636370', marginTop: 2 },
});
