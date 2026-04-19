import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';

const GAME_COLORS: Record<string, string[]> = {
  trivia: ['#5F7FFF', '#3D5AFE'],
  emoji_guess: ['#FFC371', '#FF9800'],
  would_you_rather: ['#A855F7', '#7C3AED'],
  truth_or_dare: ['#FF5F6D', '#E91E63'],
};

interface GameRoom {
  _id: string;
  room_code: string;
  game_type: string;
  host_id: string;
  players: { user_id: string; username: string; score: number }[];
  status: string;
  current_question_index: number;
  questions: { question: string; options?: string[]; correct_answer?: string }[];
  max_players: number;
  results?: any;
}

export default function GameRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/games/room/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoom(res.data);
    } catch {}
    setLoading(false);
  }, [id, token]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 3000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const isHost = room?.host_id === user?._id;
  const currentQ = room?.questions?.[room.current_question_index];
  const colors = GAME_COLORS[room?.game_type || ''] || ['#FF5F6D', '#FFC371'];

  const handleStart = async () => {
    setStarting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/games/start`, { room_id: id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRoom();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to start game';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
    setStarting(false);
  };

  const handleAnswer = async (answer: string) => {
    if (answered || answering) return;
    setSelectedAnswer(answer);
    setAnswering(true);
    try {
      await axios.post(`${BACKEND_URL}/api/games/answer`, {
        room_id: id,
        answer,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAnswered(true);
      setTimeout(() => {
        setAnswered(false);
        setSelectedAnswer(null);
        setAnswering(false);
        fetchRoom();
      }, 2000);
    } catch (err: any) {
      setAnswering(false);
      const msg = err.response?.data?.detail || 'Failed to submit answer';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const handleEndGame = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/games/end`, { room_id: id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRoom();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to end game';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  if (loading || !room) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF5F6D" />
      </View>
    );
  }

  // --- LOBBY ---
  if (room.status === 'waiting') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game Lobby</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={colors} style={styles.lobbyHero}>
          <Text style={styles.lobbyCode}>{room.room_code}</Text>
          <Text style={styles.lobbyCodeLabel}>Share this code with friends</Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PLAYERS ({room.players.length}/{room.max_players})</Text>
          {room.players.map((p, idx) => (
            <View key={idx} style={styles.playerRow}>
              <View style={[styles.playerAvatar, { backgroundColor: colors[0] + '20' }]}>
                <Ionicons name="person" size={16} color={colors[0]} />
              </View>
              <Text style={styles.playerName}>{p.username}</Text>
              {room.host_id === p.user_id && (
                <View style={styles.hostBadge}>
                  <Ionicons name="star" size={10} color="#E5B05C" />
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {isHost && room.players.length >= 2 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <TouchableOpacity testID="start-game-btn" onPress={handleStart} disabled={starting} activeOpacity={0.8}>
              <LinearGradient colors={colors} style={styles.actionBtn}>
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Start Game</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isHost && room.players.length < 2 && (
          <Text style={styles.waitingText}>Waiting for at least 2 players to join...</Text>
        )}

        {!isHost && (
          <Text style={styles.waitingText}>Waiting for host to start the game...</Text>
        )}
      </View>
    );
  }

  // --- GAME OVER ---
  if (room.status === 'finished') {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game Over</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={['#E5B05C', '#FFC371']} style={styles.winnerCard}>
          <Ionicons name="trophy" size={56} color="#fff" />
          <Text style={styles.winnerTitle}>{sorted[0]?.username || 'Winner'}</Text>
          <Text style={styles.winnerScore}>{sorted[0]?.score || 0} points</Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LEADERBOARD</Text>
          {sorted.map((p, idx) => (
            <View key={idx} style={styles.leaderRow}>
              <Text style={[styles.leaderRank, idx === 0 && { color: '#E5B05C' }]}>{idx + 1}</Text>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>{p.username}</Text>
              </View>
              <Text style={styles.leaderScore}>{p.score}</Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity testID="back-to-games-btn" onPress={() => router.back()} activeOpacity={0.8}>
            <LinearGradient colors={['#FF5F6D', '#FFC371']} style={styles.actionBtn}>
              <Ionicons name="game-controller" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Back to Games</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- IN GAME ---
  const questionNum = room.current_question_index + 1;
  const totalQ = room.questions?.length || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Q {questionNum}/{totalQ}</Text>
        {isHost && (
          <TouchableOpacity onPress={handleEndGame} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        )}
        {!isHost && <View style={{ width: 40 }} />}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(questionNum / totalQ) * 100}%`, backgroundColor: colors[0] }]} />
      </View>

      {/* Scores */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16 }}>
        <View style={styles.scoresRow}>
          {room.players.map((p, idx) => (
            <View key={idx} style={styles.scoreChip}>
              <Text style={styles.scoreChipName} numberOfLines={1}>{p.username}</Text>
              <Text style={[styles.scoreChipVal, { color: colors[0] }]}>{p.score}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Question */}
      {currentQ && (
        <View style={styles.questionSection}>
          <LinearGradient colors={colors} style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQ.question}</Text>
          </LinearGradient>

          {/* Answers */}
          <View style={styles.answersGrid}>
            {currentQ.options?.map((opt, idx) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = answered && opt === currentQ.correct_answer;
              const isWrong = answered && isSelected && opt !== currentQ.correct_answer;
              return (
                <TouchableOpacity
                  key={idx}
                  testID={`answer-${idx}`}
                  style={[
                    styles.answerBtn,
                    isSelected && !answered && { borderColor: colors[0], backgroundColor: colors[0] + '18' },
                    isCorrect && { borderColor: '#34C759', backgroundColor: '#34C75918' },
                    isWrong && { borderColor: '#FF3B30', backgroundColor: '#FF3B3018' },
                  ]}
                  onPress={() => handleAnswer(opt)}
                  disabled={answered || answering}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.answerText,
                    isCorrect && { color: '#34C759' },
                    isWrong && { color: '#FF3B30' },
                  ]}>
                    {opt}
                  </Text>
                  {isCorrect && <Ionicons name="checkmark-circle" size={20} color="#34C759" />}
                  {isWrong && <Ionicons name="close-circle" size={20} color="#FF3B30" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {answered && (
            <Text style={styles.feedbackText}>
              {selectedAnswer === currentQ.correct_answer ? '🎉 Correct!' : `❌ Correct answer: ${currentQ.correct_answer}`}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
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
  endBtn: {
    backgroundColor: '#FF3B3020', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    borderWidth: 1, borderColor: '#FF3B3033',
  },
  endBtnText: { fontSize: 13, fontWeight: '700', color: '#FF3B30' },

  lobbyHero: {
    margin: 20, padding: 32, borderRadius: 24, alignItems: 'center',
  },
  lobbyCode: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 6 },
  lobbyCodeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#636370', marginBottom: 12 },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 12, marginBottom: 6,
  },
  playerAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  playerName: { flex: 1, fontSize: 15, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD', marginLeft: 12 },
  hostBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E5B05C18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  hostBadgeText: { fontSize: 11, fontWeight: '700', color: '#E5B05C' },

  actionBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 9999,
  },
  actionBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  waitingText: { fontSize: 14, color: '#636370', textAlign: 'center', marginTop: 24 },

  // Winner / Leaderboard
  winnerCard: {
    margin: 20, padding: 32, borderRadius: 24, alignItems: 'center',
  },
  winnerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 12 },
  winnerScore: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 12, marginBottom: 6,
  },
  leaderRank: { fontSize: 18, fontWeight: '900', color: '#636370', width: 30, textAlign: 'center' },
  leaderInfo: { flex: 1, marginLeft: 8 },
  leaderName: { fontSize: 15, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  leaderScore: { fontSize: 18, fontWeight: '800', color: '#FF5F6D' },

  // In-game
  progressBar: { height: 4, backgroundColor: '#2A2A35', marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  scoresRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  scoreChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 12,
    minWidth: 70,
  },
  scoreChipName: { fontSize: 11, color: '#636370', fontWeight: '600' },
  scoreChipVal: { fontSize: 18, fontWeight: '800' },

  questionSection: { paddingHorizontal: 20, marginTop: 16 },
  questionCard: { padding: 28, borderRadius: 20, alignItems: 'center' },
  questionText: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 28 },

  answersGrid: { marginTop: 16, gap: 10 },
  answerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16,
    borderWidth: 2, borderColor: isWeb ? '#E4E6EB' : '#2A2A35',
  },
  answerText: { fontSize: 16, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD', flex: 1 },

  feedbackText: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 16, color: isWeb ? '#1C1E21' : '#FDFDFD' },
});
