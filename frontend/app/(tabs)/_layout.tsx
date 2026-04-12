import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF5F6D',
        tabBarInactiveTintColor: '#636370',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTintColor: '#FDFDFD',
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Discover',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D12',
    borderTopWidth: 1,
    borderTopColor: '#1C1C24',
    height: 80,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  header: { backgroundColor: '#0D0D12' },
  headerTitle: { fontWeight: '700', fontSize: 18 },
});
