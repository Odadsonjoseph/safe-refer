import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getToken } from "../lib/auth";

export default function Index() {
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        router.replace("/(tabs)/");
      } else {
        router.replace("/(auth)/sign-in");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#38BDF8" />
    </View>
  );
}
