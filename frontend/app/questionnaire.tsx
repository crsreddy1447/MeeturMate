import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Question { id: string; question: string; type: 'single' | 'multiple'; options: string[]; }

export default function Questionnaire() {
  const router = useRouter();
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
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.step}>QUESTION {idx + 1} OF {questions.length}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.question}>{q.question}</Text>
        <Text style={styles.hint}>{q.type === 'multiple' ? 'Select all that apply' : 'Choose one'}</Text>

        {q.options.map((opt) => (
          <TouchableOpacity testID={`q-opt-${opt}`} key={opt} style={[styles.pill, sel(opt) && styles.pillActive]} onPress={() => pick(opt)} activeOpacity={0.7}>
            <Text style={[styles.pillText, sel(opt) && styles.pillTextActive]}>{opt}</Text>
            {sel(opt) && <Ionicons name="checkmark-circle" size={22} color="#FF5F6D" />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity testID="q-prev" style={[styles.navBtn, idx === 0 && { opacity: 0.3 }]} onPress={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          <Ionicons name="arrow-back" size={22} color="#FDFDFD" />
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity testID="q-submit" style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={submit} disabled={submitting} activeOpacity={0.8}>
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Complete'}</Text>
            <Ionicons name="checkmark-circle" size={22} color="#FDFDFD" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity testID="q-next" style={styles.nextBtn} onPress={() => setIdx(idx + 1)} activeOpacity={0.8}>
            <Text style={styles.nextText}>Next</Text>
            <Ionicons name="arrow-forward" size={22} color="#FDFDFD" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  center: { flex: 1, backgroundColor: '#0D0D12', justifyContent: 'center', alignItems: 'center' },
  top: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  step: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#A0A0AB', marginBottom: 12 },
  progressTrack: { height: 4, backgroundColor: '#1C1C24', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF5F6D', borderRadius: 2 },
  body: { flex: 1 },
  bodyContent: { padding: 24, gap: 12 },
  question: { fontSize: 28, fontWeight: '700', color: '#FDFDFD', letterSpacing: -0.5, marginBottom: 4 },
  hint: { fontSize: 14, color: '#636370', marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C24', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1.5, borderColor: '#32323D' },
  pillActive: { borderColor: '#FF5F6D', backgroundColor: '#1C1420' },
  pillText: { fontSize: 16, color: '#A0A0AB', fontWeight: '500' },
  pillTextActive: { color: '#FDFDFD', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, gap: 16 },
  navBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2A2A35', alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, height: 56, borderRadius: 9999, backgroundColor: '#2A2A35', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextText: { fontSize: 16, fontWeight: '700', color: '#FDFDFD' },
  submitBtn: { flex: 1, height: 56, borderRadius: 9999, backgroundColor: '#FF5F6D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FDFDFD' },
});
