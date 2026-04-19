import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Question { id: string; question: string; type: 'single' | 'multiple'; options: string[]; }

export default function Questionnaire() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/questionnaire/questions`);
      setQuestions(res.data.questions);
    } catch { Alert.alert('Error', 'Failed to load questions'); }
    finally { setLoading(false); }
  };

  const pick = (opt: string) => {
    const q = questions[idx];
    if (q.type === 'single') {
      setResponses({ ...responses, [q.id]: opt });
    } else {
      const cur = responses[q.id] || [];
      setResponses({ ...responses, [q.id]: cur.includes(opt) ? cur.filter((a: string) => a !== opt) : [...cur, opt] });
    }
  };

  const sel = (opt: string) => {
    const q = questions[idx];
    return q.type === 'single' ? responses[q.id] === opt : (responses[q.id] || []).includes(opt);
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      await axios.post(`${BACKEND_URL}/api/questionnaire/submit`, { responses }, { headers: { Authorization: `Bearer ${token}` } });
      router.replace('/(tabs)/matches');
    } catch { Alert.alert('Error', 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF5F6D" /></View>;

  const q = questions[idx];
  const progress = ((idx + 1) / questions.length) * 100;
  const isLast = idx === questions.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress Header */}
      <View style={styles.top}>
        <View style={styles.topRow}>
          <TouchableOpacity
            testID="q-close"
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={22} color="#A0A0AB" />
          </TouchableOpacity>
          <Text style={styles.step}>{idx + 1} / {questions.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#FF5F6D', '#FFC371']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>{q.question}</Text>
        <Text style={styles.hint}>{q.type === 'multiple' ? 'Select all that apply' : 'Choose one'}</Text>

        {q.options.map((opt) => {
          const selected = sel(opt);
          return (
            <TouchableOpacity
              testID={`q-opt-${opt}`}
              key={opt}
              style={[styles.pill, selected && styles.pillActive]}
              onPress={() => pick(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, selected && styles.pillTextActive]}>{opt}</Text>
              {selected ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              ) : (
                <View style={styles.uncheckCircle} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {idx > 0 ? (
          <TouchableOpacity testID="q-prev" style={styles.navBtn} onPress={() => setIdx(idx - 1)}>
            <Ionicons name="chevron-back" size={22} color="#FDFDFD" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}

        {isLast ? (
          <TouchableOpacity
            testID="q-submit"
            style={[styles.primaryBtn, submitting && { opacity: 0.5 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>{submitting ? 'Submitting...' : 'Start Matching'}</Text>
              <Ionicons name="heart" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity testID="q-next" style={styles.primaryBtn} onPress={() => setIdx(idx + 1)} activeOpacity={0.8}>
            <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  center: { flex: 1, backgroundColor: '#0D0D12', justifyContent: 'center', alignItems: 'center' },

  top: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center',
  },
  step: { fontSize: 14, fontWeight: '700', color: '#A0A0AB' },
  progressTrack: { height: 4, backgroundColor: '#1C1C24', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  body: { flex: 1 },
  bodyContent: { padding: 24, gap: 10, paddingTop: 8 },
  question: { fontSize: 28, fontWeight: '800', color: '#FDFDFD', letterSpacing: -0.5, marginBottom: 4, lineHeight: 36 },
  hint: { fontSize: 14, color: '#636370', marginBottom: 16 },

  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1C24', paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#2A2A35',
  },
  pillActive: { borderColor: '#FF5F6D', backgroundColor: '#FF5F6D10' },
  pillText: { fontSize: 16, color: '#A0A0AB', fontWeight: '500' },
  pillTextActive: { color: '#FDFDFD', fontWeight: '600' },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center',
  },
  uncheckCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#3A3A45',
  },

  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, gap: 16, alignItems: 'center' },
  navBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center',
  },
  primaryBtn: { flex: 1, borderRadius: 9999, overflow: 'hidden' },
  primaryGradient: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 9999,
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
