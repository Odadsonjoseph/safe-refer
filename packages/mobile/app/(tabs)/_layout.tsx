import { Tabs } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { router, useRootNavigationState } from "expo-router";
import { useEffect } from "react";

function TabIcon({ color, name }: { color: string; name: string }) {
  const icons: Record<string, string> = {
    home: "⊞", submissions: "✉", earnings: "$", profile: "◉",
  };
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* placeholder — replace with @expo/vector-icons if desired */}
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key || loading) return;
    if (!user) {
      router.replace("/(auth)/sign-in");
    }
  }, [user, loading, navState?.key]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f0f9ff" }}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0EA5E9",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Listings", tabBarIcon: ({ color }) => <TabIcon color={color} name="home" /> }}
      />
      <Tabs.Screen
        name="submissions"
        options={{ title: "My Leads", tabBarIcon: ({ color }) => <TabIcon color={color} name="submissions" /> }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: "Earnings", tabBarIcon: ({ color }) => <TabIcon color={color} name="earnings" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <TabIcon color={color} name="profile" /> }}
      />
    </Tabs>
  );
}
