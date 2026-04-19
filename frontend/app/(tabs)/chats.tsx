import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';

interface Conversation {
  _id: string;
  other_user: {
    _id: string; name: string; photo?: string; age: number;
    is_online?: boolean; last_active?: string; is_verified?: boolean;
  };
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
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const colors = ['#FF5F6D', '#FFC371', '#34C759', '#5F7FFF', '#FF5F9D', '#A855F7'];

  const renderAvatar = (name: string, photo?: string, index: number = 0, size: number = 56) => {
    const bgColor = colors[index % colors.length];
    if (photo) {
      return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: bgColor }}>{name.charAt(0).toUpperCase()}</Text>
      </View>
    );
  };

  // Split conversations with and without messages for "New Matches" row
  const newMatches = conversations.filter(c => !c.last_message);
  const activeChats = conversations.filter(c => c.last_message);

  const renderNewMatch = ({ item, index }: { item: Conversation; index: number }) => (
    <TouchableOpacity
      style={styles.newMatchItem}
      onPress={() => router.push(`/chat/${item.other_user._id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.newMatchAvatarWrap}>
        <LinearGradient colors={['#FF5F6D', '#FFC371']} style={styles.newMatchRing}>
          {renderAvatar(item.other_user.name, item.other_user.photo, index, 60)}
        </LinearGradient>
      </View>
      <Text style={styles.newMatchName} numberOfLines={1}>{item.other_user.name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );

  const renderChat = ({ item, index }: { item: Conversation; index: number }) => {
    const hasUnread = item.unread_count > 0;
    return (
      <TouchableOpacity
        testID={`conv-${item._id}`}
        style={styles.chatRow}
        onPress={() => router.push(`/chat/${item.other_user._id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatarWrap}>
          {renderAvatar(item.other_user.name, item.other_user.photo, index)}
          {item.other_user.is_online && <View style={styles.onlineDot} />}
          {!item.other_user.is_online && item.other_user.last_active && <View style={[styles.onlineDot, styles.offlineDot]} />}
        </View>

        <View style={styles.chatMid}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameBold]}>{item.other_user.name}</Text>
            {item.other_user.is_verified && <Ionicons name="checkmark-circle" size={14} color="#34C759" />}
          </View>
          <Text style={[styles.chatMsg, hasUnread && styles.chatMsgBold]} numberOfLines={1}>{item.last_message}</Text>
        </View>

        <View style={styles.chatRight}>
          <Text style={[styles.chatTime, hasUnread && styles.chatTimeActive]}>{formatTime(item.updated_at)}</Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF5F6D" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="search-outline" size={22} color="#FDFDFD" />
          </TouchableOpacity>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Ionicons name="chatbubbles-outline" size={48} color="#636370" />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>Match with someone to start chatting</Text>
          <TouchableOpacity style={styles.discoverBtn} onPress={() => router.push('/(tabs)/matches')} activeOpacity={0.8}>
            <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.discoverGradient}>
              <Text style={styles.discoverText}>Start swiping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeChats}
          renderItem={renderChat}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            newMatches.length > 0 ? (
              <View style={styles.newMatchSection}>
                <Text style={styles.sectionLabel}>New Matches</Text>
                <FlatList
                  data={newMatches}
                  renderItem={renderNewMatch}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.newMatchList}
                />
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabel}>Messages</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },
  center: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12', justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    ...(isWeb ? { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E4E6EB' } : {}),
  },
  title: { fontSize: 28, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', alignItems: 'center', justifyContent: 'center',
  },

  newMatchSection: { paddingTop: 4, ...(isWeb ? { backgroundColor: '#FFFFFF', paddingBottom: 4 } : {}) },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: isWeb ? '#65676B' : '#636370', paddingHorizontal: 20, marginBottom: 12 },
  newMatchList: { paddingHorizontal: 16, gap: 16 },
  newMatchItem: { alignItems: 'center', width: 72 },
  newMatchAvatarWrap: {},
  newMatchRing: { padding: 3, borderRadius: 33 },
  newMatchName: { fontSize: 12, color: isWeb ? '#1C1E21' : '#FDFDFD', marginTop: 6, fontWeight: '500' },
  sectionDivider: { height: 1, backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', marginVertical: 16, marginHorizontal: 20 },

  chatRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
    alignItems: 'center',
    ...(isWeb ? { borderRadius: 10, marginHorizontal: 8, marginVertical: 2 } : {}),
  },
  chatAvatarWrap: { position: 'relative', marginRight: 14 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#34C759', borderWidth: 2, borderColor: isWeb ? '#FFFFFF' : '#0D0D12',
  },
  offlineDot: { backgroundColor: '#636370' },
  chatMid: { flex: 1, justifyContent: 'center' },
  chatName: { fontSize: 16, fontWeight: '500', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 3 },
  chatNameBold: { fontWeight: '700' },
  chatMsg: { fontSize: 14, color: isWeb ? '#65676B' : '#636370' },
  chatMsgBold: { color: isWeb ? '#1C1E21' : '#A0A0AB' },
  chatRight: { alignItems: 'flex-end', gap: 6 },
  chatTime: { fontSize: 12, color: isWeb ? '#65676B' : '#636370' },
  chatTimeActive: { color: '#1877F2' },
  unreadBadge: {
    backgroundColor: isWeb ? '#1877F2' : '#FF5F6D', borderRadius: 10,
    minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 6 },
  emptySub: { fontSize: 15, color: isWeb ? '#65676B' : '#A0A0AB', marginBottom: 28 },
  discoverBtn: { borderRadius: 9999, overflow: 'hidden' },
  discoverGradient: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 9999,
  },
  discoverText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
