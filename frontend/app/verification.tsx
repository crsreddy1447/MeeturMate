import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Image } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';

type VerificationType = 'live_photo' | 'kyc' | 'id_verification';

const VERIFICATION_METHODS = [
  {
    type: 'live_photo' as VerificationType,
    icon: 'camera' as const,
    label: 'Live Photo',
    description: 'Take a live selfie to verify your identity. Fastest method!',
    time: 'Instant',
    color: '#34C759',
  },
  {
    type: 'kyc' as VerificationType,
    icon: 'document-text' as const,
    label: 'KYC Verification',
    description: 'Upload your government ID for full KYC verification.',
    time: '24 hours',
    color: '#5F7FFF',
  },
  {
    type: 'id_verification' as VerificationType,
    icon: 'card' as const,
    label: 'ID Verification',
    description: 'Upload a photo of your ID card, passport, or license.',
    time: '24 hours',
    color: '#FFC371',
  },
];

const ID_TYPES = [
  { key: 'aadhaar', label: 'Aadhaar Card', icon: 'finger-print' },
  { key: 'passport', label: 'Passport', icon: 'airplane' },
  { key: 'drivers_license', label: "Driver's License", icon: 'car' },
  { key: 'national_id', label: 'National ID', icon: 'id-card' },
];

export default function Verification() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, loadUser } = useAuthStore();
  const [selectedMethod, setSelectedMethod] = useState<VerificationType | null>(null);
  const [selectedIdType, setSelectedIdType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(user?.verification_status || 'unverified');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/verification/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.data.verification_status);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      const msg = 'Please select a verification method';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    if (selectedMethod !== 'live_photo' && !selectedIdType) {
      const msg = 'Please select your ID type';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        verification_type: selectedMethod,
      };

      if (selectedMethod === 'live_photo') {
        // In production, capture live selfie via camera
        body.selfie_base64 = 'placeholder_selfie_data';
      } else {
        body.id_type = selectedIdType;
        body.id_front_base64 = 'placeholder_id_front';
        body.id_back_base64 = 'placeholder_id_back';
      }

      const res = await axios.post(`${BACKEND_URL}/api/verification/submit`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await loadUser();
      setStatus(res.data.status);

      const msg = res.data.message;
      if (Platform.OS === 'web') {
        window.alert(msg);
        if (res.data.status === 'verified') router.back();
      } else {
        Alert.alert('Verification', msg, [
          { text: 'OK', onPress: () => { if (res.data.status === 'verified') router.back(); } },
        ]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Verification failed';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBanner = () => {
    if (status === 'verified') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#34C75918', borderColor: '#34C75933' }]}>
          <Ionicons name="checkmark-circle" size={32} color="#34C759" />
          <Text style={[styles.statusTitle, { color: '#34C759' }]}>Profile Verified</Text>
          <Text style={styles.statusDesc}>Your profile is verified. You have full access to all features.</Text>
        </View>
      );
    }
    if (status === 'pending') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FFC37118', borderColor: '#FFC37133' }]}>
          <Ionicons name="time" size={32} color="#FFC371" />
          <Text style={[styles.statusTitle, { color: '#FFC371' }]}>Verification Pending</Text>
          <Text style={styles.statusDesc}>We're reviewing your submission. This usually takes up to 24 hours.</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="verify-back-btn">
          <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderStatusBanner()}

      {/* Why Verify */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WHY VERIFY?</Text>
        <View style={styles.card}>
          <WhyItem icon="shield-checkmark" text="Get the verified badge on your profile" color="#34C759" />
          <WhyItem icon="chatbubbles" text="Unlimited messages in all conversations" color="#5F7FFF" />
          <WhyItem icon="game-controller" text="Access to Gaming Zone" color="#FF5F6D" />
          <WhyItem icon="people" text="Higher trust & more matches" color="#FFC371" />
          <WhyItem icon="star" text="Priority in match results" color="#E5B05C" />
        </View>
      </View>

      {/* Limited Access Warning */}
      {status === 'unverified' && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color="#FF5F6D" />
          <Text style={styles.warningText}>
            Unverified profiles have limited access: 5 messages per conversation, no gaming zone access.
          </Text>
        </View>
      )}

      {/* Verification Methods */}
      {status === 'unverified' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CHOOSE VERIFICATION METHOD</Text>
          {VERIFICATION_METHODS.map((method) => {
            const selected = selectedMethod === method.type;
            return (
              <TouchableOpacity
                key={method.type}
                testID={`verify-${method.type}`}
                style={[styles.methodCard, selected && { borderColor: method.color }]}
                onPress={() => setSelectedMethod(method.type)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconWrap, { backgroundColor: method.color + '18' }]}>
                  <Ionicons name={method.icon} size={24} color={method.color} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={styles.methodDesc}>{method.description}</Text>
                  <View style={styles.methodTimeRow}>
                    <Ionicons name="time-outline" size={12} color="#636370" />
                    <Text style={styles.methodTime}>{method.time}</Text>
                  </View>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={24} color={method.color} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="#636370" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ID Type Selection */}
      {status === 'unverified' && selectedMethod && selectedMethod !== 'live_photo' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT ID TYPE</Text>
          <View style={styles.card}>
            <View style={styles.chipContainer}>
              {ID_TYPES.map((idType) => {
                const selected = selectedIdType === idType.key;
                return (
                  <TouchableOpacity
                    key={idType.key}
                    testID={`id-${idType.key}`}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setSelectedIdType(idType.key)}
                  >
                    <Ionicons name={idType.icon as any} size={16} color={selected ? '#fff' : '#A0A0AB'} />
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{idType.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Submit Button */}
      {status === 'unverified' && selectedMethod && (
        <View style={styles.submitSection}>
          <TouchableOpacity testID="verify-submit-btn" onPress={handleSubmit} disabled={loading} activeOpacity={0.8} style={styles.submitBtn}>
            <LinearGradient colors={['#FF5F6D', '#FF8A5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnGrad}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Verification</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.privacyNote}>
            Your data is encrypted and used only for verification purposes.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function WhyItem({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={styles.whyItem}>
      <View style={[styles.whyIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.whyText}>{text}</Text>
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

  statusBanner: {
    margin: 20, padding: 20, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, gap: 8,
  },
  statusTitle: { fontSize: 18, fontWeight: '800' },
  statusDesc: { fontSize: 13, color: '#A0A0AB', textAlign: 'center' },

  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#636370', marginBottom: 12 },

  card: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 20, padding: 16,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },

  whyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  whyIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  whyText: { fontSize: 14, color: isWeb ? '#1C1E21' : '#FDFDFD', flex: 1 },

  warningCard: {
    margin: 20, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FF5F6D12', borderWidth: 1, borderColor: '#FF5F6D33',
  },
  warningText: { fontSize: 13, color: '#FF5F6D', flex: 1, lineHeight: 18 },

  methodCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16,
    borderWidth: 2, borderColor: isWeb ? '#E4E6EB' : '#2A2A35',
    marginBottom: 10,
  },
  methodIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  methodInfo: { flex: 1, marginLeft: 14 },
  methodLabel: { fontSize: 16, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  methodDesc: { fontSize: 12, color: '#A0A0AB', marginTop: 2, lineHeight: 16 },
  methodTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  methodTime: { fontSize: 11, color: '#636370', fontWeight: '600' },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9999,
    borderWidth: 1.5, borderColor: '#2A2A35', backgroundColor: '#0D0D12',
  },
  chipSelected: { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#A0A0AB' },
  chipTextSelected: { color: '#fff' },

  submitSection: { paddingHorizontal: 20, marginTop: 28 },
  submitBtn: { borderRadius: 9999, overflow: 'hidden' },
  submitBtnGrad: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 9999,
  },
  submitBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  privacyNote: { fontSize: 12, color: '#636370', textAlign: 'center', marginTop: 12 },
});
