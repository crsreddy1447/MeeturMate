import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const { user, loadUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadUser();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.container} testID="splash-screen">
        <Ionicons name="heart" size={56} color="#FF5F6D" />
        <Text style={styles.brand}>MeeturMate</Text>
        <ActivityIndicator size="small" color="#FF5F6D" style={styles.loader} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!user.questionnaire_completed) {
    return <Redirect href="/questionnaire" />;
  }

  return <Redirect href="/(tabs)/matches" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FDFDFD',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  loader: {
    marginTop: 32,
  },
});
