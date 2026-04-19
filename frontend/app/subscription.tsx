import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Dimensions, Linking } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';
const SCREEN_WIDTH = Dimensions.get('window').width;

interface Plan {
  id: string;
  label: string;
  amount: number;
  currency: string;
  duration_days: number;
  price_display: string;
}

export default function Subscription() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, loadUser } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/subscription/plans`);
      setPlans(res.data.plans);
    } catch {
      // fallback
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Create order
      const orderRes = await axios.post(
        `${BACKEND_URL}/api/subscription/create-order`,
        { plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { order_id, amount, currency, key_id } = orderRes.data;

      if (isWeb) {
        // Web: Open Razorpay checkout
        const options = {
          key: key_id,
          amount,
          currency,
          name: 'MeeturMate',
          description: `Premium ${selectedPlan} subscription`,
          order_id,
          handler: async (response: any) => {
            await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          },
          prefill: {
            email: user?.email || '',
            contact: '',
          },
          theme: { color: '#FF5F6D' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Mobile: Use Razorpay's checkout URL or WebView
        // For now, show order details and let user know
        const msg = `Order created! Order ID: ${order_id}\nAmount: ₹${amount / 100}\n\nIn production, this would open Razorpay's mobile SDK.`;
        Alert.alert('Payment', msg);
        // In production, integrate react-native-razorpay
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create order';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/subscription/verify-payment`,
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          plan: selectedPlan,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadUser();
      const msg = 'You are now a Premium member!';
      if (Platform.OS === 'web') {
        window.alert(msg);
        router.back();
      } else {
        Alert.alert('Success', msg, [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Payment verification failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const planDetails: Record<string, { save?: string; popular?: boolean; perMonth: string }> = {
    monthly: { perMonth: '₹499/mo', },
    quarterly: { save: 'Save 13%', popular: true, perMonth: '₹433/mo' },
    yearly: { save: 'Save 33%', perMonth: '₹333/mo' },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="sub-back-btn">
          <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Go Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero */}
      <LinearGradient colors={['#E5B05C', '#C8943D', '#A67C2E']} style={styles.heroGradient}>
        <Ionicons name="diamond" size={56} color="#fff" />
        <Text style={styles.heroTitle}>Unlock Everything</Text>
        <Text style={styles.heroSub}>Get unlimited access to all premium features</Text>
      </LinearGradient>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionLabel}>PREMIUM FEATURES</Text>
        <View style={styles.featuresCard}>
          <FeatureItem icon="chatbubbles" text="Unlimited conversations" />
          <FeatureItem icon="eye" text="See who liked you" />
          <FeatureItem icon="star" text="5 Super Likes per day" />
          <FeatureItem icon="shield-checkmark" text="Priority verification" />
          <FeatureItem icon="game-controller" text="Full gaming zone access" />
          <FeatureItem icon="funnel" text="Advanced match filters" />
          <FeatureItem icon="flash" text="Boost your profile" />
          <FeatureItem icon="close-circle" text="No ads" />
        </View>
      </View>

      {/* Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionLabel}>CHOOSE YOUR PLAN</Text>
        {loadingPlans ? (
          <ActivityIndicator color="#E5B05C" size="large" />
        ) : (
          <View style={styles.plansRow}>
            {plans.map((plan) => {
              const selected = selectedPlan === plan.id;
              const details = planDetails[plan.id] || {};
              return (
                <TouchableOpacity
                  key={plan.id}
                  testID={`plan-${plan.id}`}
                  style={[styles.planCard, selected && styles.planCardSelected]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.8}
                >
                  {details.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>{plan.label.replace('Premium ', '')}</Text>
                  <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>{plan.price_display}</Text>
                  <Text style={[styles.planPer, selected && styles.planPerSelected]}>{details.perMonth}</Text>
                  {details.save && <Text style={styles.planSave}>{details.save}</Text>}
                  {selected && <Ionicons name="checkmark-circle" size={24} color="#E5B05C" style={{ marginTop: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Subscribe Button */}
      <View style={styles.subscribeSection}>
        <TouchableOpacity testID="subscribe-btn" onPress={handleSubscribe} disabled={loading} activeOpacity={0.8} style={styles.subscribeBtn}>
          <LinearGradient colors={['#E5B05C', '#D4A44B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.subscribeBtnGrad}>
            {loading ? (
              <ActivityIndicator color="#0D0D12" />
            ) : (
              <>
                <Ionicons name="diamond" size={20} color="#0D0D12" />
                <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.secureNote}>
          <Ionicons name="lock-closed" size={12} color="#636370" /> Secured by Razorpay. Cancel anytime.
        </Text>
      </View>

      {/* Current Status */}
      {user?.is_premium && (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          <Text style={styles.statusText}>You're a Premium member!</Text>
          <Text style={styles.statusSub}>Plan: {user.subscription_plan || 'Active'}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon as any} size={18} color="#E5B05C" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD' },

  heroGradient: {
    padding: 40, alignItems: 'center', marginHorizontal: 20, borderRadius: 24, marginTop: 12,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 16 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },

  featuresSection: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#636370', marginBottom: 12 },
  featuresCard: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 20, padding: 16,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  featureIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#E5B05C18',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  featureText: { fontSize: 15, color: isWeb ? '#1C1E21' : '#FDFDFD', fontWeight: '500' },

  plansSection: { paddingHorizontal: 20, marginTop: 24 },
  plansRow: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1, backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 20, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: isWeb ? '#E4E6EB' : '#2A2A35',
  },
  planCardSelected: { borderColor: '#E5B05C', backgroundColor: isWeb ? '#FFF9ED' : '#1E1A28' },
  planLabel: { fontSize: 14, fontWeight: '700', color: isWeb ? '#65676B' : '#A0A0AB', marginBottom: 8 },
  planLabelSelected: { color: '#E5B05C' },
  planPrice: { fontSize: 22, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  planPriceSelected: { color: '#E5B05C' },
  planPer: { fontSize: 12, color: '#636370', marginTop: 4 },
  planPerSelected: { color: '#A0A0AB' },
  planSave: { fontSize: 11, fontWeight: '700', color: '#34C759', marginTop: 6, backgroundColor: '#34C75918', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: '#FF5F6D', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  popularText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  subscribeSection: { paddingHorizontal: 20, marginTop: 28 },
  subscribeBtn: { borderRadius: 9999, overflow: 'hidden' },
  subscribeBtnGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9999 },
  subscribeBtnText: { fontSize: 17, fontWeight: '800', color: '#0D0D12' },
  secureNote: { fontSize: 12, color: '#636370', textAlign: 'center', marginTop: 12 },

  statusCard: {
    margin: 20, padding: 20, borderRadius: 16,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', alignItems: 'center', gap: 8,
  },
  statusText: { fontSize: 16, fontWeight: '700', color: '#34C759' },
  statusSub: { fontSize: 13, color: '#636370' },
});
