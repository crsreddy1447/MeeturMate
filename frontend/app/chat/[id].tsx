import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
  Alert, Linking, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';

interface Message { _id: string; sender_id: string; content: string; timestamp: string; read: boolean; message_type?: string; disappearing?: boolean; }

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ name: string; photo?: string; is_online?: boolean; last_active?: string; is_verified?: boolean }>({ name: 'Chat' });
  const flatRef = useRef<FlatList>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [disappearingMode, setDisappearingMode] = useState(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => {
      clearInterval(interval);
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, [id]);

  const loadMessages = async () => {
    try {
      const convRes = await axios.get(`${BACKEND_URL}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const conv = convRes.data.conversations.find((c: any) => c.other_user._id === id);
      if (conv) {
        setOtherUser(conv.other_user);
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
      await axios.post(`${BACKEND_URL}/api/messages/send`, {
        receiver_id: id, content: newMsg.trim(), message_type: 'text',
        ...(disappearingMode ? { disappearing: true } : {}),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewMsg('');
      await loadMessages();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to send');
    } finally { setSending(false); }
  };

  const openMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
      default: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`,
    });
    if (url) Linking.openURL(url);
  };

  const sendLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to share your location');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const content = JSON.stringify({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      await axios.post(`${BACKEND_URL}/api/messages/send`,
        { receiver_id: id, content, message_type: 'location' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAttach(false);
      await loadMessages();
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Could not get your location');
    }
  };

  const startLiveLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is needed');
      return;
    }
    setIsLiveSharing(true);
    setShowAttach(false);

    // Send initial location
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await axios.post(`${BACKEND_URL}/api/messages/send`,
        { receiver_id: id, content: JSON.stringify({ lat: loc.coords.latitude, lng: loc.coords.longitude, is_live: true }), message_type: 'location' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadMessages();
    } catch {}

    // Update every 15 seconds
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await axios.post(`${BACKEND_URL}/api/messages/send`,
          { receiver_id: id, content: JSON.stringify({ lat: loc.coords.latitude, lng: loc.coords.longitude, is_live: true }), message_type: 'location' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await loadMessages();
      } catch {}
    }, 15000);
    liveIntervalRef.current = interval;

    // Auto-stop after 15 minutes
    setTimeout(() => stopLiveLocation(), 15 * 60 * 1000);
  };

  const stopLiveLocation = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    setIsLiveSharing(false);
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMsg = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.sender_id === user?._id;
    const showTail = index === messages.length - 1 ||
      messages[index + 1]?.sender_id !== item.sender_id;

    // Location message
    if (item.message_type === 'location') {
      let loc: { lat: number; lng: number; is_live?: boolean } | null = null;
      try { loc = JSON.parse(item.content); } catch {}
      if (loc) {
        return (
          <View style={[styles.msgWrap, mine ? styles.myWrap : styles.theirWrap]}>
            {!mine && showTail && (
              <View style={styles.theirAvatar}>
                {otherUser.photo ? (
                  <Image source={{ uri: otherUser.photo }} style={styles.miniAvatar} />
                ) : (
                  <View style={[styles.miniAvatar, styles.miniAvatarFallback]}>
                    <Text style={styles.miniAvatarText}>{otherUser.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity
              style={[styles.locBubble, mine ? styles.myLocBubble : styles.theirLocBubble, !mine && !showTail && { marginLeft: 38 }]}
              onPress={() => openMaps(loc!.lat, loc!.lng)}
              activeOpacity={0.8}
            >
              <View style={styles.locMapArea}>
                <Ionicons name="location" size={36} color={mine ? '#fff' : '#FF5F6D'} />
                {loc.is_live && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.locBottom}>
                <Text style={[styles.locCoords, mine && { color: 'rgba(255,255,255,0.85)' }]}>
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </Text>
                <Text style={[styles.locTap, mine && { color: 'rgba(255,255,255,0.6)' }]}>Tap to view in Maps</Text>
              </View>
              <View style={styles.msgMeta}>
                <Text style={[styles.msgTime, mine ? styles.myTime : styles.theirTime]}>{fmtTime(item.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      }
    }

    return (
      <View style={[styles.msgWrap, mine ? styles.myWrap : styles.theirWrap]}>
        {!mine && showTail && (
          <View style={styles.theirAvatar}>
            {otherUser.photo ? (
              <Image source={{ uri: otherUser.photo }} style={styles.miniAvatar} />
            ) : (
              <View style={[styles.miniAvatar, styles.miniAvatarFallback]}>
                <Text style={styles.miniAvatarText}>{otherUser.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}
        <View style={[
          styles.bubble,
          mine ? styles.myBubble : styles.theirBubble,
          showTail && mine && styles.myTail,
          showTail && !mine && styles.theirTail,
          !mine && !showTail && { marginLeft: 38 },
        ]}>
          <Text style={[styles.msgText, mine && styles.myMsgText]}>{item.content}</Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, mine ? styles.myTime : styles.theirTime]}>{fmtTime(item.timestamp)}</Text>
            {mine && item.read && <Ionicons name="checkmark-done" size={14} color="#FFB0B6" style={{ marginLeft: 4 }} />}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF5F6D" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="chat-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={isWeb ? '#1C1E21' : '#FDFDFD'} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {otherUser.photo ? (
            <Image source={{ uri: otherUser.photo }} style={styles.headerAvatar} />
          ) : (
            <LinearGradient colors={['#FF5F6D', '#FFC371']} style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{otherUser.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.headerName}>{otherUser.name}</Text>
              {otherUser.is_verified && <Ionicons name="checkmark-circle" size={14} color="#34C759" />}
            </View>
            {otherUser.is_online ? (
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            ) : otherUser.last_active ? (
              <Text style={styles.onlineText}>
                Last seen {new Date(otherUser.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setDisappearingMode(!disappearingMode)}
            style={[styles.headerAction, disappearingMode && { backgroundColor: isWeb ? '#E7F3FF' : '#FF5F6D22' }]}
          >
            <Ionicons name="timer-outline" size={20} color={disappearingMode ? '#FF5F6D' : '#636370'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-vertical" size={20} color="#636370" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        renderItem={renderMsg}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyCircle}>
              <Ionicons name="hand-left-outline" size={36} color="#636370" />
            </View>
            <Text style={styles.emptyTitle}>Say hello to {otherUser.name}!</Text>
            <Text style={styles.emptySub}>Be the first to start the conversation</Text>
          </View>
        }
      />

      {/* Live Location Banner */}
      {isLiveSharing && (
        <TouchableOpacity style={styles.liveBanner} onPress={stopLiveLocation} activeOpacity={0.8}>
          <View style={styles.liveBannerDot} />
          <Text style={styles.liveBannerText}>Sharing live location...</Text>
          <Text style={styles.liveBannerStop}>STOP</Text>
        </TouchableOpacity>
      )}

      {/* Disappearing Mode Banner */}
      {disappearingMode && (
        <View style={styles.disappearBanner}>
          <Ionicons name="timer-outline" size={16} color="#FF5F6D" />
          <Text style={styles.disappearBannerText}>Disappearing messages ON — messages auto-delete after 5 min</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowAttach(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={32} color="#FF5F6D" />
        </TouchableOpacity>
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
        <TouchableOpacity
          testID="send-btn"
          style={[styles.sendBtn, (!newMsg.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!newMsg.trim() || sending}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={newMsg.trim() && !sending ? ['#FF5F6D', '#FF8A5C'] : ['#2A2A35', '#2A2A35']}
            style={styles.sendGradient}
          >
            <Ionicons name="send" size={18} color={newMsg.trim() && !sending ? '#fff' : '#636370'} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Location Attach Modal */}
      <Modal visible={showAttach} transparent animationType="slide" onRequestClose={() => setShowAttach(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAttach(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Share Location</Text>

            <TouchableOpacity style={styles.modalOption} onPress={sendLocation} activeOpacity={0.7}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#FF5F6D20' }]}>
                <Ionicons name="navigate" size={24} color="#FF5F6D" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>Send Current Location</Text>
                <Text style={styles.modalOptionSub}>Share where you are right now</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={isLiveSharing ? () => { stopLiveLocation(); setShowAttach(false); } : startLiveLocation}
              activeOpacity={0.7}
            >
              <View style={[styles.modalIconWrap, { backgroundColor: isLiveSharing ? '#FF445820' : '#34C75920' }]}>
                <Ionicons name={isLiveSharing ? 'stop-circle' : 'pulse'} size={24} color={isLiveSharing ? '#FF4458' : '#34C759'} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>{isLiveSharing ? 'Stop Live Location' : 'Share Live Location'}</Text>
                <Text style={styles.modalOptionSub}>{isLiveSharing ? 'Currently sharing your location' : 'Share for 15 minutes'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },
  center: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12', justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 14,
    backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12',
    borderBottomWidth: 1, borderBottomColor: isWeb ? '#E4E6EB' : '#1C1C24',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerName: { fontSize: 16, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759' },
  onlineText: { fontSize: 12, color: '#34C759' },
  headerAction: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  msgList: { padding: 16, flexGrow: 1, ...(isWeb ? { maxWidth: 800, alignSelf: 'center' as any, width: '100%' as any } : {}) },
  msgWrap: { flexDirection: 'row', marginBottom: 4, maxWidth: '80%' },
  myWrap: { alignSelf: 'flex-end' },
  theirWrap: { alignSelf: 'flex-start' },
  theirAvatar: { marginRight: 8, alignSelf: 'flex-end' },
  miniAvatar: { width: 28, height: 28, borderRadius: 14 },
  miniAvatarFallback: { backgroundColor: isWeb ? '#E4E6EB' : '#2A2A35', alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontSize: 12, fontWeight: '700', color: isWeb ? '#65676B' : '#A0A0AB' },

  bubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '100%' },
  myBubble: { backgroundColor: isWeb ? '#1877F2' : '#FF5F6D' },
  theirBubble: { backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24' },
  myTail: { borderBottomRightRadius: 6 },
  theirTail: { borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, color: isWeb ? '#1C1E21' : '#FDFDFD', lineHeight: 22 },
  myMsgText: { color: '#fff' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { fontSize: 11 },
  myTime: { color: 'rgba(255,255,255,0.6)' },
  theirTime: { color: isWeb ? '#65676B' : '#636370' },

  inputBar: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: isWeb ? '#E4E6EB' : '#1C1C24', alignItems: 'flex-end',
    backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12',
    ...(isWeb ? { paddingBottom: 12 } : {}),
  },
  attachBtn: { justifyContent: 'center', paddingRight: 4, paddingBottom: 7 },
  input: {
    flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#1C1C24', borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12,
    fontSize: 15, color: isWeb ? '#1C1E21' : '#FDFDFD', maxHeight: 100, marginRight: 8,
    ...(isWeb ? { outlineStyle: 'none' as any } : {}),
  },
  sendBtn: { borderRadius: 24, overflow: 'hidden' },
  sendBtnDisabled: {},
  sendGradient: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },

  // Location message styles
  locBubble: { borderRadius: 16, overflow: 'hidden', width: 220, maxWidth: '100%' },
  myLocBubble: { backgroundColor: isWeb ? '#1877F2' : '#FF5F6D' },
  theirLocBubble: { backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24' },
  locMapArea: {
    height: 100, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  liveBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#34C759', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  locBottom: { paddingHorizontal: 12, paddingVertical: 8 },
  locCoords: { fontSize: 13, fontWeight: '600', color: isWeb ? '#65676B' : '#A0A0AB' },
  locTap: { fontSize: 11, color: isWeb ? '#65676B' : '#636370', marginTop: 2 },

  // Live sharing banner
  liveBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#34C75915', paddingVertical: 10, gap: 8,
    borderTopWidth: 1, borderTopColor: '#34C75930',
  },
  liveBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' },
  liveBannerText: { fontSize: 13, fontWeight: '600', color: '#34C759' },
  liveBannerStop: { fontSize: 12, fontWeight: '800', color: '#FF4458', marginLeft: 8 },

  // Attachment modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isWeb ? 'center' : 'flex-end', alignItems: isWeb ? 'center' : 'stretch' },
  modalSheet: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    ...(isWeb ? { borderRadius: 16, width: 420, maxWidth: '90%' } : {}),
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: isWeb ? '#CED0D4' : '#3A3A45',
    alignSelf: 'center', marginBottom: 20,
    ...(isWeb ? { display: 'none' } : {}),
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 20 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14,
  },
  modalIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOptionText: { flex: 1 },
  modalOptionLabel: { fontSize: 16, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  modalOptionSub: { fontSize: 13, color: isWeb ? '#65676B' : '#636370', marginTop: 2 },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 4 },
  emptySub: { fontSize: 14, color: isWeb ? '#65676B' : '#636370' },

  disappearBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: isWeb ? '#FFF3E0' : '#FF5F6D15', paddingVertical: 8, gap: 6,
    borderTopWidth: 1, borderTopColor: isWeb ? '#FFE0B2' : '#FF5F6D30',
  },
  disappearBannerText: { fontSize: 12, fontWeight: '600', color: '#FF5F6D' },
});
