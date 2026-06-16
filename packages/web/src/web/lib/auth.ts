import * as React from "react";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

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
  plugins: [magicLinkClient()],
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
  emailVerified: boolean;
  image?: string;
  role?: "affiliate" | "business";
  isAdmin?: boolean;
  applicationStatus?: "incomplete" | "submitted" | "approved" | "rejected";
  referralCode?: string;
  referredBy?: string;
  companyName?: string;
  phone?: string;
  [key: string]: any;
};

export function useAuth() {
  const { data: session, isPending: authLoading } = authClient.useSession();
  const authUser = session?.user as AuthUser | null | undefined;

  // Fetch DB profile to get real role, applicationStatus, etc.
  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);

  React.useEffect(() => {
    if (!authUser?.id) { setProfile(null); return; }
    setProfileLoading(true);
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setProfile(d?.user ?? null))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [authUser?.id]);

  // Merge auth user with DB profile — profile wins for role/status fields
  const user: AuthUser | null = authUser
    ? { ...authUser, ...(profile ?? {}) }
    : null;

  return {
    user,
    loading: authLoading || (!!authUser && profileLoading),
    session,
  };
}
