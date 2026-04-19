import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const isWeb = Platform.OS === 'web';

function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { route: '/(tabs)/matches', icon: 'flame', iconOutline: 'flame-outline', label: 'Discover' },
    { route: '/(tabs)/chats', icon: 'chatbubble', iconOutline: 'chatbubble-outline', label: 'Messages' },
    { route: '/(tabs)/games', icon: 'game-controller', iconOutline: 'game-controller-outline', label: 'Games' },
    { route: '/(tabs)/profile', icon: 'person', iconOutline: 'person-outline', label: 'Profile' },
  ];

  return (
    <View style={webStyles.sidebar}>
      <View style={webStyles.sidebarLogo}>
        <Ionicons name="flame" size={32} color="#1877F2" />
        <Text style={webStyles.sidebarLogoText}>MeeturMate</Text>
      </View>
      {tabs.map((tab) => {
        const active = pathname.includes(tab.label.toLowerCase() === 'discover' ? 'matches' : tab.label.toLowerCase());
        return (
          <TouchableOpacity
            key={tab.route}
            style={[webStyles.sidebarItem, active && webStyles.sidebarItemActive]}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.icon as any : tab.iconOutline as any}
              size={24}
              color={active ? '#1877F2' : '#65676B'}
            />
            <Text style={[webStyles.sidebarLabel, active && webStyles.sidebarLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  if (isWeb) {
    return (
      <View style={webStyles.root}>
        <WebSidebar />
        <View style={webStyles.content}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: 'none' },
              headerShown: false,
            }}
          >
            <Tabs.Screen name="matches" />
            <Tabs.Screen name="chats" />
            <Tabs.Screen name="games" />
            <Tabs.Screen name="profile" />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF5F6D',
        tabBarInactiveTintColor: '#4A4A56',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? 'flame' : 'flame-outline'} size={26} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={24} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? 'game-controller' : 'game-controller-outline'} size={24} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D12',
    borderTopWidth: 1,
    borderTopColor: '#1A1A22',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 0,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabIconWrap: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  activeIndicator: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#FF5F6D',
  },
});

const webStyles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F0F2F5' },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E4E6EB',
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  sidebarLogo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingBottom: 24, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#E4E6EB',
  },
  sidebarLogoText: { fontSize: 22, fontWeight: '800', color: '#1877F2', letterSpacing: -0.5 },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 4,
  },
  sidebarItemActive: { backgroundColor: '#E7F3FF' },
  sidebarLabel: { fontSize: 16, fontWeight: '500', color: '#65676B' },
  sidebarLabelActive: { color: '#1877F2', fontWeight: '700' },
  content: { flex: 1 },
});
