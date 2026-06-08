import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";

export const TOKEN_KEY = "safe_refer_token";

const baseURL =
  Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "";

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth",
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: async () => (await SecureStore.getItemAsync(TOKEN_KEY)) ?? "",
    },
  },
});

export async function getToken(): Promise<string> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? "";
}

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function captureToken(res: Response) {
  const token = res.headers.get("set-auth-token");
  if (token) await saveToken(token);
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "poster" | "referrer" | "admin";
  status: "pending" | "approved" | "rejected";
  stripeAccountId?: string | null;
  payoutEnabled?: boolean;
};
