import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { user, loadUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    await loadUser();
    setIsReady(true);
  };

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
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
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});