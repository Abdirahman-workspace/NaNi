import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "../src/constants/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: Colors.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[username]" options={{ title: "Profile" }} />
          <Stack.Screen
            name="edit-profile"
            options={{ title: "Edit Profile", presentation: "modal" }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: "Settings", presentation: "modal" }}
          />
          <Stack.Screen name="followers/[username]" options={{ title: "Followers" }} />
          <Stack.Screen name="inbox" options={{ title: "Inbox" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
