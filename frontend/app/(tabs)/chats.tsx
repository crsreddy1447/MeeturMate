import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Conversation {
  _id: string;
  other_user: { _id: string; name: string; photo?: string; age: number };
  last_message: string;
  updated_at: string;
  unread_count: number;
}

export default function Chats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      setConversations(res.data.conversations);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const colors = ['#FF5F6D', '#FFC371', '#34C759', '#5F7FFF', '#FF5F9D'];

  const renderItem = ({ item, index }: { item: Conversation; index: number }) => {
    const bgColor = colors[index % colors.length];
    return (
      <TouchableOpacity testID={`conv-${item._id}`} style={styles.row} onPress={() => router.push(`/chat/${item.other_user._id}`)} activeOpacity={0.7}>
        {item.other_user.photo ? (
          <Image source={{ uri: item.other_user.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: bgColor + '22' }]}>
            <Text style={[styles.avatarLetter, { color: bgColor }]}>{item.other_user.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.mid}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.other_user.name}</Text>
            <Text style={styles.time}>{formatTime(item.updated_at)}</Text>
          </View>
          <View style={styles.msgRow}>
            <Text style={styles.msg} numberOfLines={1}>{item.last_message}</Text>
            {item.unread_count > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF5F6D" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={56} color="#636370" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Start chatting with your matches</Text>
        </View>
      ) : (
        <FlatList data={conversations} renderItem={renderItem} keyExtractor={(item) => item._id} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  center: { flex: 1, backgroundColor: '#0D0D12', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#FDFDFD', letterSpacing: -0.5 },
  row: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1C1C24' },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 14 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 22, fontWeight: '800' },
  mid: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#FDFDFD' },
  time: { fontSize: 12, color: '#636370' },
  msgRow: { flexDirection: 'row', alignItems: 'center' },
  msg: { flex: 1, fontSize: 14, color: '#A0A0AB' },
  badge: { backgroundColor: '#FF5F6D', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FDFDFD' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FDFDFD', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#A0A0AB', marginTop: 6 },
});
