import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator,
  Alert, Dimensions, Animated, PanResponder, Platform,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = isWeb ? 380 : Math.min(SCREEN_WIDTH - 32, 420);
const CARD_HEIGHT = isWeb ? 520 : Math.min(SCREEN_HEIGHT * 0.62, 560);

interface Match {
  _id: string; name: string; age: number; bio?: string;
  location?: string; photo?: string; match_score: number; gender: string;
  is_verified?: boolean; connection_types?: string[]; interests?: string[];
  photo_blurred?: boolean; is_super_liked?: boolean;
}

export default function Matches() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/matches/find`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMatches(res.data.matches);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sendSuperLike = async (targetId: string) => {
    try {
      await axios.post(`${BACKEND_URL}/api/super-like`, { target_user_id: targetId }, { headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  };

  const handleSwipeComplete = useCallback((direction: 'left' | 'right' | 'up') => {
    const match = matches[currentIndex];
    if (!match) return;

    if (direction === 'right' || direction === 'up') {
      if (!user?.is_premium && (user as any)?.active_conversations?.length >= 2) {
        Alert.alert('Upgrade Required', 'Free users can chat with 2 people max. Go Premium for unlimited!', [
          { text: 'Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') },
        ]);
      } else {
        router.push(`/chat/${match._id}`);
      }
    }

    setCurrentIndex(prev => prev + 1);
    position.setValue({ x: 0, y: 0 });
  }, [currentIndex, matches, user]);

  const forceSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    const x = direction === 'left' ? -SCREEN_WIDTH * 1.5 : direction === 'right' ? SCREEN_WIDTH * 1.5 : 0;
    const y = direction === 'up' ? -SCREEN_HEIGHT : 0;
    Animated.timing(position, {
      toValue: { x, y },
      duration: 300,
      useNativeDriver: true,
    }).start(() => handleSwipeComplete(direction));
  }, [handleSwipeComplete]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          forceSwipe('up');
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const renderCard = (match: Match, index: number) => {
    if (index < currentIndex) return null;
    const colors = ['#FF5F6D', '#FFC371', '#34C759', '#5F7FFF', '#FF5F9D', '#A855F7'];
    const bgColor = colors[index % colors.length];

    if (index === currentIndex) {
      return (
        <Animated.View
          key={match._id}
          style={[
            styles.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* LIKE stamp */}
          <Animated.View style={[styles.stampWrap, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, styles.stampLikeText]}>LIKE</Text>
          </Animated.View>
          {/* NOPE stamp */}
          <Animated.View style={[styles.stampWrap, styles.stampNope, { opacity: nopeOpacity }]}>
            <Text style={[styles.stampText, styles.stampNopeText]}>NOPE</Text>
          </Animated.View>

          {match.photo ? (
            <>
              <Image source={{ uri: match.photo }} style={[styles.cardImage, match.photo_blurred && { opacity: 0.3 }]} blurRadius={match.photo_blurred ? 20 : 0} />
              {match.photo_blurred && (
                <View style={styles.blurOverlay}>
                  <Ionicons name="eye-off" size={36} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.blurText}>Photo Hidden</Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.cardImage, styles.avatarFallback, { backgroundColor: bgColor + '30' }]}>
              <Text style={[styles.avatarInitial, { color: bgColor }]}>{match.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {match.is_super_liked && (
            <View style={styles.superLikedBadge}>
              <Ionicons name="star" size={14} color="#fff" />
              <Text style={styles.superLikedText}>Super Liked You</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>{match.name}</Text>
                {match.is_verified && <Ionicons name="checkmark-circle" size={20} color="#34C759" style={{ marginLeft: 4 }} />}
                <Text style={styles.cardAge}>{match.age}</Text>
              </View>
              {match.location && (
                <View style={styles.locRow}>
                  <Ionicons name="location-sharp" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.locText}>{match.location}</Text>
                </View>
              )}
              {match.bio && <Text style={styles.cardBio} numberOfLines={2}>{match.bio}</Text>}
              {(match.connection_types?.length ?? 0) > 0 && (
                <View style={styles.tagRow}>
                  {match.connection_types!.slice(0, 3).map(ct => (
                    <View key={ct} style={styles.tag}>
                      <Text style={styles.tagText}>{ct}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(match.interests?.length ?? 0) > 0 && (
                <View style={styles.tagRow}>
                  {match.interests!.slice(0, 4).map(int => (
                    <View key={int} style={[styles.tag, styles.interestTag]}>
                      <Text style={styles.tagText}>{int}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.matchBadge}>
                <Ionicons name="heart" size={12} color="#FF5F6D" />
                <Text style={styles.matchText}>{match.match_score}% Match</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      );
    }

    // Next card behind
    if (index === currentIndex + 1) {
      return (
        <Animated.View
          key={match._id}
          style={[
            styles.card,
            styles.nextCard,
            { transform: [{ scale: nextCardScale }] },
          ]}
        >
          {match.photo ? (
            <Image source={{ uri: match.photo }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.avatarFallback, { backgroundColor: bgColor + '30' }]}>
              <Text style={[styles.avatarInitial, { color: bgColor }]}>{match.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.cardGradient}>
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>{match.name}</Text>
                <Text style={styles.cardAge}>{match.age}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5F6D" />
      </View>
    );
  }

  const hasCards = currentIndex < matches.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity testID="filter-btn" style={styles.headerBtn} onPress={() => router.push('/filters')}>
          <Ionicons name="options-outline" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <Ionicons name="flame" size={28} color="#FF5F6D" />
          <Text style={styles.logoText}>MeeturMate</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(tabs)/chats')}>
          <Ionicons name="chatbubble" size={22} color="#FDFDFD" />
        </TouchableOpacity>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {hasCards ? (
          <>
            {matches.map((m, i) => renderCard(m, i)).reverse()}
          </>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyCircle}>
              <Ionicons name="heart-dislike-outline" size={48} color="#636370" />
            </View>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptySub}>Check back later for new people</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setCurrentIndex(0); setLoading(true); loadMatches(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FF5F6D" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {hasCards && (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <TouchableOpacity
            testID="nope-btn"
            style={[styles.actionBtn, styles.nopeBtn]}
            onPress={() => forceSwipe('left')}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={32} color="#FF4458" />
          </TouchableOpacity>

          <TouchableOpacity
            testID="superlike-btn"
            style={[styles.actionBtn, styles.superBtn]}
            onPress={() => {
              const match = matches[currentIndex];
              if (match) sendSuperLike(match._id);
              forceSwipe('up');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={28} color="#1DA1F2" />
          </TouchableOpacity>

          <TouchableOpacity
            testID="like-btn"
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => forceSwipe('right')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={32} color="#34C759" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },
  center: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12', justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    ...(isWeb ? { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E4E6EB' } : {}),
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', alignItems: 'center', justifyContent: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoText: { fontSize: 20, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD', letterSpacing: -0.3 },

  cardContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    ...(isWeb ? { paddingVertical: 24 } : {}),
  },
  card: {
    width: CARD_WIDTH, height: CARD_HEIGHT,
    borderRadius: isWeb ? 16 : 24, overflow: 'hidden',
    position: 'absolute', backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24',
    elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isWeb ? 0.12 : 0.3, shadowRadius: 16,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  nextCard: { top: 8 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 120, fontWeight: '900', opacity: 0.5 },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '50%', justifyContent: 'flex-end', padding: 24,
  },
  cardInfo: {},
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 28, fontWeight: '800', color: '#fff' },
  cardAge: { fontSize: 22, fontWeight: '400', color: 'rgba(255,255,255,0.8)' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  cardBio: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 21, marginBottom: 8 },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  matchText: { fontSize: 13, fontWeight: '600', color: '#FF5F6D' },

  stampWrap: {
    position: 'absolute', top: 40, zIndex: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 4, borderRadius: 12,
  },
  stampLike: { left: 24, borderColor: '#34C759', transform: [{ rotate: '-15deg' }] },
  stampNope: { right: 24, borderColor: '#FF4458', transform: [{ rotate: '15deg' }] },
  stampText: { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  stampLikeText: { color: '#34C759' },
  stampNopeText: { color: '#FF4458' },

  actions: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 20, paddingTop: 16,
    ...(isWeb ? { paddingBottom: 24 } : {}),
  },
  actionBtn: {
    borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
    ...(isWeb ? { cursor: 'pointer' as any } : {}),
  },
  nopeBtn: {
    width: 64, height: 64, backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12', borderColor: isWeb ? '#FFB8C0' : '#FF445830',
  },
  superBtn: {
    width: 52, height: 52, backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12', borderColor: isWeb ? '#B8DEFF' : '#1DA1F230',
  },
  likeBtn: {
    width: 64, height: 64, backgroundColor: isWeb ? '#FFFFFF' : '#0D0D12', borderColor: isWeb ? '#A8F0BF' : '#34C75930',
  },

  empty: { alignItems: 'center', padding: 32 },
  emptyCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 6 },
  emptySub: { fontSize: 15, color: isWeb ? '#65676B' : '#A0A0AB', marginBottom: 24 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 9999, borderWidth: 2, borderColor: '#FF5F6D',
  },
  refreshText: { fontSize: 15, fontWeight: '600', color: '#FF5F6D' },

  blurOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  blurText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: '600' },
  superLikedBadge: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1DA1F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
  },
  superLikedText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(255,95,109,0.25)',
  },
  interestTag: { backgroundColor: 'rgba(95,127,255,0.25)' },
  tagText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
