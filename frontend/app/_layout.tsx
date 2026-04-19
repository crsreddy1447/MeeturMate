import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D12' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="questionnaire" />
        <Stack.Screen name="filters" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="referral" />
        <Stack.Screen name="game-room/[id]" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
