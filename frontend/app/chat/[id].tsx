import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Message { _id: string; sender_id: string; content: string; timestamp: string; read: boolean; }

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('Chat');
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const loadMessages = async () => {
    try {
      const convRes = await axios.get(`${BACKEND_URL}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const conv = convRes.data.conversations.find((c: any) => c.other_user._id === id);
      if (conv) {
        setOtherName(conv.other_user.name);
        const msgRes = await axios.get(`${BACKEND_URL}/api/messages/${conv._id}`, { headers: { Authorization: `Bearer ${token}` } });
        setMessages(msgRes.data.messages);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const send = async () => {
    if (!newMsg.trim() || sending) return;
    try {
      setSending(true);
      await axios.post(`${BACKEND_URL}/api/messages/send`, { receiver_id: id, content: newMsg.trim(), message_type: 'text' }, { headers: { Authorization: `Bearer ${token}` } });
      setNewMsg('');
      await loadMessages();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to send');
    } finally { setSending(false); }
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMsg = ({ item }: { item: Message }) => {
    const mine = item.sender_id === user?._id;
    return (
      <View style={[styles.msgWrap, mine ? styles.myWrap : styles.theirWrap]}>
        <View style={[styles.bubble, mine ? styles.myBubble : styles.theirBubble]}>
          <Text style={styles.msgText}>{item.content}</Text>
          <Text style={[styles.msgTime, mine ? styles.myTime : styles.theirTime]}>{fmtTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF5F6D" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container} keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="chat-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherName}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        renderItem={renderMsg}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-outline" size={48} color="#2A2A35" />
            <Text style={styles.emptyText}>Say hello!</Text>
          </View>
        }
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          testID="chat-input"
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#636370"
          value={newMsg}
          onChangeText={setNewMsg}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity testID="send-btn" style={[styles.sendBtn, (!newMsg.trim() || sending) && { opacity: 0.3 }]} onPress={send} disabled={!newMsg.trim() || sending}>
          <Ionicons name="send" size={20} color="#FDFDFD" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  center: { flex: 1, backgroundColor: '#0D0D12', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1C1C24' },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerName: { fontSize: 18, fontWeight: '600', color: '#FDFDFD' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' },
  msgList: { padding: 16, flexGrow: 1 },
  msgWrap: { marginBottom: 10, maxWidth: '80%' },
  myWrap: { alignSelf: 'flex-end' },
  theirWrap: { alignSelf: 'flex-start' },
  bubble: { padding: 14, borderRadius: 20 },
  myBubble: { backgroundColor: '#FF5F6D', borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: '#1C1C24', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, color: '#FDFDFD', lineHeight: 22 },
  msgTime: { fontSize: 11, marginTop: 4 },
  myTime: { color: '#FFB0B6', textAlign: 'right' },
  theirTime: { color: '#636370' },
  inputBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1C1C24', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#1C1C24', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: '#FDFDFD', maxHeight: 100, marginRight: 10 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, color: '#636370', marginTop: 10 },
});
