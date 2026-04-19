import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator, Share } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';

interface ReferralInfo {
  referral_code: string;
  referral_count: number;
  coins: number;
  referral_link: string;
}

interface ReferralEntry {
  user_name: string;
  coins_awarded: number;
  date: string;
}

export default function Referral() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, loadUser } = useAuthStore();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [history, setHistory] = useState<ReferralEntry[]>([]);
  const [applyCode, setApplyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [infoRes, historyRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/referral/info`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BACKEND_URL}/api/referral/history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setInfo(infoRes.data);
      setHistory(historyRes.data.referrals);
    } catch {}
    setLoading(false);
  };

  const handleCopyCode = async () => {
    if (!info) return;
    try {
      if (isWeb) {
        await navigator.clipboard.writeText(info.referral_code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!info) return;
    const message = `Join me on MeeturMate! Use my referral code ${info.referral_code} to get 100 bonus coins! ${info.referral_link}`;
    if (isWeb) {
      try { await navigator.clipboard.writeText(message); } catch {}
      window.alert('Referral link copied to clipboard!');
    } else {
      Share.share({ message });
    }
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) {
      const msg = 'Please enter a referral code';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }
    setApplying(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/referral/apply`,
        { referral_code: applyCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadUser();
      await fetchData();
      const msg = res.data.message;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Success', msg);
      setApplyCode('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to apply referral code';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
    setApplying(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="referral-back-btn">
          <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero Card */}
      <LinearGradient colors={['#FF5F6D', '#FF8A5C', '#FFC371']} style={styles.heroCard}>
        <Ionicons name="gift" size={48} color="#fff" />
        <Text style={styles.heroTitle}>Invite Friends, Earn Coins!</Text>
        <Text style={styles.heroSub}>Both you and your friend get 100 coins when they join</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{info?.referral_count || 0}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{info?.coins || user?.coins || 0}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Your Referral Code */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>YOUR REFERRAL CODE</Text>
        <View style={styles.codeCard}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{info?.referral_code || user?.referral_code || '...'}</Text>
          </View>
          <TouchableOpacity testID="copy-code-btn" style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.7}>
            <Ionicons name={copied ? 'checkmark' : 'copy'} size={18} color="#fff" />
            <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity testID="share-referral-btn" style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareBtnGrad}>
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>Share with Friends</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Apply Referral Code */}
      {!user?.referred_by && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HAVE A REFERRAL CODE?</Text>
          <View style={styles.applyCard}>
            <TextInput
              testID="referral-code-input"
              style={styles.applyInput}
              placeholder="Enter referral code"
              placeholderTextColor="#636370"
              value={applyCode}
              onChangeText={setApplyCode}
              autoCapitalize="characters"
              maxLength={8}
            />
            <TouchableOpacity
              testID="apply-code-btn"
              style={[styles.applyBtn, applying && { opacity: 0.6 }]}
              onPress={handleApplyCode}
              disabled={applying}
              activeOpacity={0.8}
            >
              {applying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.applyBtnText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user?.referred_by && (
        <View style={styles.appliedCard}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.appliedText}>Referral code already applied!</Text>
        </View>
      )}

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.card}>
          <StepItem step="1" text="Share your referral code with friends" icon="share-social-outline" />
          <StepItem step="2" text="They sign up and enter your code" icon="person-add-outline" />
          <StepItem step="3" text="Both of you earn 100 bonus coins!" icon="gift-outline" />
        </View>
      </View>

      {/* Referral History */}
      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REFERRAL HISTORY</Text>
          <View style={styles.card}>
            {history.map((entry, idx) => (
              <View key={idx} style={[styles.historyRow, idx > 0 && styles.historyDivider]}>
                <View style={styles.historyAvatar}>
                  <Ionicons name="person" size={16} color="#FF5F6D" />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{entry.user_name}</Text>
                  <Text style={styles.historyDate}>{new Date(entry.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.coinsBadge}>
                  <Ionicons name="diamond" size={12} color="#E5B05C" />
                  <Text style={styles.coinsText}>+{entry.coins_awarded}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function StepItem({ step, text, icon }: { step: string; text: string; icon: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepNum}>{step}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
      <Ionicons name={icon as any} size={18} color="#636370" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD' },

  heroCard: {
    margin: 20, padding: 28, borderRadius: 24, alignItems: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 12, textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#636370', marginBottom: 12 },

  codeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16, padding: 6,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  codeBox: {
    flex: 1, height: 48, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  codeText: { fontSize: 20, fontWeight: '900', letterSpacing: 3, color: isWeb ? '#1C1E21' : '#FDFDFD' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF5F6D', paddingHorizontal: 16, height: 48, borderRadius: 12,
  },
  copyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  shareBtn: { borderRadius: 9999, overflow: 'hidden', marginTop: 12 },
  shareBtnGrad: {
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 9999,
  },
  shareBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  applyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16, padding: 6,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  applyInput: {
    flex: 1, height: 48, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12',
    borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontWeight: '700',
    color: isWeb ? '#1C1E21' : '#FDFDFD', letterSpacing: 2, textAlign: 'center',
  },
  applyBtn: {
    backgroundColor: '#34C759', paddingHorizontal: 20, height: 48,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  appliedCard: {
    margin: 20, padding: 14, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', gap: 8, backgroundColor: '#34C75918', borderWidth: 1, borderColor: '#34C75933',
  },
  appliedText: { fontSize: 14, fontWeight: '600', color: '#34C759' },

  card: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 20, padding: 16,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF5F6D',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '800', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: isWeb ? '#1C1E21' : '#FDFDFD' },

  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  historyDivider: { borderTopWidth: 1, borderTopColor: '#2A2A35' },
  historyAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF5F6D18',
    alignItems: 'center', justifyContent: 'center',
  },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyName: { fontSize: 15, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  historyDate: { fontSize: 12, color: '#636370', marginTop: 2 },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E5B05C18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  coinsText: { fontSize: 13, fontWeight: '700', color: '#E5B05C' },
});
