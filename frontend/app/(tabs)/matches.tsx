import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Match { _id: string; name: string; age: number; bio?: string; location?: string; photo?: string; match_score: number; gender: string; }

export default function Matches() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/matches/find`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMatches(res.data.matches);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const startChat = (match: Match) => {
    if (!user?.is_premium && (user?.active_conversations?.length || 0) >= 2) {
      Alert.alert('Upgrade Required', 'Free users can chat with 2 people max. Go Premium for unlimited chats!', [
        { text: 'Later', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }
    router.push(`/chat/${match._id}`);
  };

  const renderMatch = ({ item, index }: { item: Match; index: number }) => {
    const colors = ['#FF5F6D', '#FFC371', '#34C759', '#5F7FFF', '#FF5F9D'];
    const bgColor = colors[index % colors.length];

    return (
      <TouchableOpacity testID={`match-card-${item._id}`} style={styles.card} onPress={() => startChat(item)} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.avatarFallback, { backgroundColor: bgColor + '22' }]}>
              <Text style={[styles.avatarInitial, { color: bgColor }]}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.scoreBadge}>
            <Ionicons name="heart" size={12} color="#FF5F6D" />
            <Text style={styles.scoreText}>{item.match_score}%</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.name}, {item.age}</Text>
          {item.location ? (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={13} color="#636370" />
              <Text style={styles.locText}>{item.location}</Text>
            </View>
          ) : null}
          {item.bio ? <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text> : null}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity testID={`chat-btn-${item._id}`} style={styles.chatBtn} onPress={() => startChat(item)}>
            <Ionicons name="chatbubble" size={18} color="#FDFDFD" />
            <Text style={styles.chatBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF5F6D" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Discover</Text>
          <Text style={styles.subGreeting}>{matches.length} people near you</Text>
        </View>
        <TouchableOpacity testID="filter-btn" style={styles.filterBtn} onPress={() => router.push('/filters')}>
          <Ionicons name="options-outline" size={22} color="#FDFDFD" />
        </TouchableOpacity>
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-dislike-outline" size={56} color="#636370" />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Pull down to find new connections</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMatches(); }} tintColor="#FF5F6D" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  center: { flex: 1, backgroundColor: '#0D0D12', justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#FDFDFD', letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: '#A0A0AB', marginTop: 2 },
  filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#1C1C24', borderRadius: 24, overflow: 'hidden' },
  cardTop: { position: 'relative' },
  cardImage: { width: '100%', height: 160, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 48, fontWeight: '800' },
  scoreBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0D0D12CC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#FF5F6D' },
  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#FDFDFD' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText: { fontSize: 12, color: '#636370' },
  cardBio: { fontSize: 13, color: '#A0A0AB', marginTop: 6, lineHeight: 18 },
  cardActions: { paddingHorizontal: 14, paddingBottom: 14 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF5F6D', height: 40, borderRadius: 9999 },
  chatBtnText: { color: '#FDFDFD', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FDFDFD', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#A0A0AB', marginTop: 6 },
});
