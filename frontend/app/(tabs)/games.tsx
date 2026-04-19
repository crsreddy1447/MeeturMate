import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';
const SCREEN_WIDTH = Dimensions.get('window').width;

interface GameType {
  id: string;
  label: string;
  description: string;
  icon: string;
  min_players: number;
  max_players: number;
}

interface ActiveRoom {
  _id: string;
  room_code: string;
  game_type: string;
  player_count: number;
  max_players: number;
  host_id: string;
  players: any[];
}

const GAME_COLORS: Record<string, string[]> = {
  trivia: ['#5F7FFF', '#3D5AFE'],
  emoji_guess: ['#FFC371', '#FF9800'],
  would_you_rather: ['#A855F7', '#7C3AED'],
  truth_or_dare: ['#FF5F6D', '#E91E63'],
};

const GAME_ICONS: Record<string, string> = {
  trivia: 'bulb',
  emoji_guess: 'happy',
  would_you_rather: 'swap-horizontal',
  truth_or_dare: 'flame',
};

export default function Games() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchActiveRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, roomsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/games/types`),
        axios.get(`${BACKEND_URL}/api/games/active-rooms`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setGameTypes(typesRes.data.games);
      setActiveRooms(roomsRes.data.rooms);
    } catch {}
    setLoading(false);
  };

  const fetchActiveRooms = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/games/active-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveRooms(res.data.rooms);
    } catch {}
  };

  const handleCreateRoom = async (gameType: string) => {
    if (!user?.is_verified && !user?.is_premium) {
      const msg = 'Verify your profile to access the Gaming Zone!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Verification Required', msg, [
        { text: 'Verify Now', onPress: () => router.push('/verification') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    setCreating(gameType);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/games/create-room`,
        { game_type: gameType, max_players: 4 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/game-room/${res.data.room_id}` as any);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create room';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
    setCreating('');
  };

  const handleJoinRoom = async (roomIdOrCode?: string) => {
    const code = roomIdOrCode || joinCode.trim();
    if (!code) {
      const msg = 'Enter a room code to join';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    if (!user?.is_verified && !user?.is_premium) {
      const msg = 'Verify your profile to access the Gaming Zone!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Verification Required', msg);
      return;
    }

    setJoining(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/games/join-room`,
        { room_id: code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/game-room/${res.data.room_id}` as any);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to join room';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF5F6D" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Gaming Zone</Text>
        <View style={styles.coinsBadge}>
          <Ionicons name="diamond" size={14} color="#E5B05C" />
          <Text style={styles.coinsText}>{user?.coins || 0}</Text>
        </View>
      </View>

      {/* Verification Banner */}
      {!user?.is_verified && !user?.is_premium && (
        <TouchableOpacity
          style={styles.verifyBanner}
          onPress={() => router.push('/verification')}
          activeOpacity={0.8}
          testID="games-verify-banner"
        >
          <Ionicons name="shield-checkmark" size={20} color="#FF5F6D" />
          <Text style={styles.verifyBannerText}>Verify your profile to play games</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF5F6D" />
        </TouchableOpacity>
      )}

      {/* Join Room */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>JOIN A ROOM</Text>
        <View style={styles.joinRow}>
          <TextInput
            testID="join-code-input"
            style={styles.joinInput}
            placeholder="Enter room code"
            placeholderTextColor="#636370"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity
            testID="join-room-btn"
            style={[styles.joinBtn, joining && { opacity: 0.6 }]}
            onPress={() => handleJoinRoom()}
            disabled={joining}
            activeOpacity={0.8}
          >
            {joining ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="enter" size={18} color="#fff" />
                <Text style={styles.joinBtnText}>Join</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Games */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CREATE A GAME</Text>
        <View style={styles.gamesGrid}>
          {gameTypes.map((game) => {
            const colors = GAME_COLORS[game.id] || ['#FF5F6D', '#FFC371'];
            const icon = GAME_ICONS[game.id] || 'game-controller';
            const isCreating = creating === game.id;
            return (
              <TouchableOpacity
                key={game.id}
                testID={`create-${game.id}`}
                style={styles.gameCard}
                onPress={() => handleCreateRoom(game.id)}
                disabled={!!creating}
                activeOpacity={0.85}
              >
                <LinearGradient colors={colors} style={styles.gameCardGrad}>
                  {isCreating ? (
                    <ActivityIndicator color="#fff" size="large" />
                  ) : (
                    <>
                      <Ionicons name={icon as any} size={36} color="#fff" />
                      <Text style={styles.gameCardTitle}>{game.label}</Text>
                      <Text style={styles.gameCardDesc} numberOfLines={2}>{game.description}</Text>
                      <View style={styles.gameCardMeta}>
                        <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.gameCardPlayers}>{game.min_players}-{game.max_players} players</Text>
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Active Rooms */}
      {activeRooms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OPEN ROOMS</Text>
          {activeRooms.map((room) => {
            const colors = GAME_COLORS[room.game_type] || ['#FF5F6D', '#FFC371'];
            const gameLabel = gameTypes.find(g => g.id === room.game_type)?.label || room.game_type;
            return (
              <TouchableOpacity
                key={room._id}
                testID={`room-${room._id}`}
                style={styles.roomCard}
                onPress={() => handleJoinRoom(room.room_code)}
                activeOpacity={0.8}
              >
                <View style={[styles.roomIcon, { backgroundColor: colors[0] + '20' }]}>
                  <Ionicons name={GAME_ICONS[room.game_type] as any || 'game-controller'} size={20} color={colors[0]} />
                </View>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomTitle}>{gameLabel}</Text>
                  <Text style={styles.roomCode}>Code: {room.room_code}</Text>
                </View>
                <View style={styles.roomPlayers}>
                  <Text style={styles.roomPlayerCount}>{room.player_count}/{room.max_players}</Text>
                  <Ionicons name="people" size={14} color="#636370" />
                </View>
                <TouchableOpacity style={[styles.roomJoinBtn, { backgroundColor: colors[0] }]}>
                  <Text style={styles.roomJoinText}>Join</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Game Rewards Info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REWARDS</Text>
        <View style={styles.rewardsCard}>
          <View style={styles.rewardRow}>
            <Ionicons name="trophy" size={18} color="#E5B05C" />
            <Text style={styles.rewardText}>Win a game to earn 50 coins</Text>
          </View>
          <View style={styles.rewardRow}>
            <Ionicons name="people" size={18} color="#5F7FFF" />
            <Text style={styles.rewardText}>Play with matches to boost connections</Text>
          </View>
          <View style={styles.rewardRow}>
            <Ionicons name="diamond" size={18} color="#A855F7" />
            <Text style={styles.rewardText}>Use coins for premium features</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: isWeb ? '#FFF9ED' : '#E5B05C18',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5B05C33',
  },
  coinsText: { fontSize: 14, fontWeight: '700', color: '#E5B05C' },

  verifyBanner: {
    marginHorizontal: 20, padding: 14, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', gap: 8, backgroundColor: '#FF5F6D12',
    borderWidth: 1, borderColor: '#FF5F6D33', marginBottom: 8,
  },
  verifyBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#FF5F6D' },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#636370', marginBottom: 12 },

  joinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16, padding: 6,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  joinInput: {
    flex: 1, height: 48, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12',
    borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontWeight: '700',
    color: isWeb ? '#1C1E21' : '#FDFDFD', letterSpacing: 2, textAlign: 'center',
  },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#5F7FFF', paddingHorizontal: 20, height: 48, borderRadius: 12,
  },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  gamesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  gameCard: {
    width: isWeb ? 'calc(50% - 6px)' as any : (SCREEN_WIDTH - 52) / 2,
    borderRadius: 20, overflow: 'hidden',
  },
  gameCardGrad: {
    padding: 20, minHeight: 160, justifyContent: 'center', alignItems: 'center',
  },
  gameCardTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 10, textAlign: 'center' },
  gameCardDesc: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6, textAlign: 'center', lineHeight: 15 },
  gameCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  gameCardPlayers: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  roomCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16,
    marginBottom: 8, ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  roomIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomInfo: { flex: 1, marginLeft: 12 },
  roomTitle: { fontSize: 15, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  roomCode: { fontSize: 12, color: '#636370', marginTop: 2, fontWeight: '600' },
  roomPlayers: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 10 },
  roomPlayerCount: { fontSize: 13, fontWeight: '600', color: '#A0A0AB' },
  roomJoinBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
  roomJoinText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  rewardsCard: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 20, padding: 16,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rewardText: { fontSize: 14, color: isWeb ? '#1C1E21' : '#FDFDFD' },
});
