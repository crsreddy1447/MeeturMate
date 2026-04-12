import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const daysLeft = () => {
    if (!user?.subscription_end) return 0;
    return Math.max(0, Math.ceil((new Date(user.subscription_end).getTime() - Date.now()) / 86400000));
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        {user?.photo ? (
          <Image source={{ uri: user.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {!user?.is_premium && (
          <View style={styles.trialPill}>
            <Ionicons name="time-outline" size={14} color="#E5B05C" />
            <Text style={styles.trialText}>{daysLeft()} days left in trial</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT YOU</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="calendar-outline" label="Age" value={String(user?.age || '')} />
          <View style={styles.divider} />
          <InfoRow icon="transgender-outline" label="Gender" value={user?.gender || ''} />
          <View style={styles.divider} />
          <InfoRow icon="location-outline" label="Location" value={user?.location || 'Not set'} />
        </View>
      </View>

      {!user?.is_premium && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GO PREMIUM</Text>
          <View style={styles.premiumCard}>
            <Ionicons name="diamond" size={32} color="#E5B05C" />
            <Text style={styles.premiumTitle}>Unlock Premium</Text>
            <View style={styles.featureList}>
              <Feature text="Unlimited conversations" />
              <Feature text="See who liked you" />
              <Feature text="Advanced filters & priority" />
              <Feature text="Background verification badge" />
            </View>
            <TouchableOpacity testID="upgrade-btn" style={styles.upgradeBtn} activeOpacity={0.8}>
              <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
            </TouchableOpacity>
            <Text style={styles.freeNote}>Free plan: Chat with up to 2 people</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <MenuItem icon="create-outline" label="Edit Profile" />
        <MenuItem icon="notifications-outline" label="Notifications" />
        <MenuItem icon="shield-checkmark-outline" label="Privacy & Safety" />
        <MenuItem icon="help-circle-outline" label="Help & Support" />
      </View>

      <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={22} color="#FF5F6D" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MeeturMate v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color="#636370" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color="#34C759" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function MenuItem({ icon, label }: { icon: any; label: string }) {
  return (
    <TouchableOpacity testID={`menu-${label}`} style={styles.menuItem} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color="#FDFDFD" />
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#636370" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  hero: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 14 },
  avatarFallback: { backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 40, fontWeight: '800', color: '#FF5F6D' },
  name: { fontSize: 24, fontWeight: '700', color: '#FDFDFD' },
  email: { fontSize: 14, color: '#A0A0AB', marginTop: 4 },
  trialPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2A2A35', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, marginTop: 12 },
  trialText: { fontSize: 12, fontWeight: '600', color: '#E5B05C' },
  section: { paddingHorizontal: 24, marginTop: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#636370', marginBottom: 12 },
  infoCard: { backgroundColor: '#1C1C24', borderRadius: 16, padding: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  infoLabel: { flex: 1, fontSize: 15, color: '#A0A0AB', marginLeft: 12 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#FDFDFD' },
  divider: { height: 1, backgroundColor: '#2A2A35', marginHorizontal: 16 },
  premiumCard: { backgroundColor: '#1C1C24', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5B05C33' },
  premiumTitle: { fontSize: 22, fontWeight: '700', color: '#FDFDFD', marginTop: 12, marginBottom: 16 },
  featureList: { width: '100%', gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#A0A0AB' },
  upgradeBtn: { width: '100%', height: 52, backgroundColor: '#E5B05C', borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  upgradeBtnText: { fontSize: 16, fontWeight: '700', color: '#0D0D12' },
  freeNote: { fontSize: 12, color: '#636370' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C24', padding: 16, borderRadius: 16, marginBottom: 8 },
  menuText: { flex: 1, fontSize: 15, color: '#FDFDFD', marginLeft: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1C1C24', padding: 16, borderRadius: 16, marginHorizontal: 24, marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#FF5F6D' },
  version: { fontSize: 12, color: '#636370', textAlign: 'center', paddingVertical: 24 },
});
