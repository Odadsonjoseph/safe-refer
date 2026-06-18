/**
 * Registers the device for Expo push notifications and sends the token
 * to the Referrd backend so the server can send push notifications.
 */
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getToken } from "../lib/auth";
import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.apiUrl ?? "https://referrd.one";

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permission not granted");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#87CEEB",
    });
  }

  // Get the Expo project ID from app.json extra
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("[push] No EAS project ID found — push token registration skipped");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (e) {
    console.error("[push] Failed to get push token:", e);
    return null;
  }
}

async function sendTokenToServer(token: string) {
  try {
    const authToken = await getToken();
    if (!authToken) return;

    const res = await fetch(`${API_BASE}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      console.error("[push] Failed to register token:", await res.text());
    }
  } catch (e) {
    console.error("[push] Failed to send token to server:", e);
  }
}

// Set how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export function usePushToken(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        sendTokenToServer(token);
      }
    });
  }, [isAuthenticated]);
}
