import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";
import { api } from "./api";

export const TOKEN_KEY = "safe_refer_token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem(TOKEN_KEY) ?? "",
    },
  },
});

export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "poster" | "referrer" | "admin";
  status: "pending" | "approved" | "rejected";
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (api.users.me.$get() as Promise<Response>)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (data?.user) setUser(data.user);
        else clearToken();
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
