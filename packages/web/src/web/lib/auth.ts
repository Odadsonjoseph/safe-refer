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

const PROFILE_CACHE_KEY = "sr_profile_cache";

function getCachedProfile(userId: string): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached?.id === userId) return cached;
  } catch {}
  return null;
}

function setCachedProfile(profile: AuthUser) {
  try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch {}
}

function clearCachedProfile() {
  try { sessionStorage.removeItem(PROFILE_CACHE_KEY); } catch {}
}

export function useAuth() {
  const { data: session, isPending: authLoading } = authClient.useSession();
  const authUser = session?.user as AuthUser | null | undefined;

  // Seed from cache immediately so role is available on first render
  const [profile, setProfile] = React.useState<AuthUser | null>(() =>
    authUser?.id ? getCachedProfile(authUser.id) : null
  );
  const [profileLoading, setProfileLoading] = React.useState(!profile && !!authUser?.id);
  const fetchedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!authUser?.id) {
      setProfile(null);
      clearCachedProfile();
      fetchedFor.current = null;
      return;
    }
    // Already have a fresh cache or already fetching for this user
    if (fetchedFor.current === authUser.id) return;
    fetchedFor.current = authUser.id;

    // Show cached immediately, then refresh in background
    const cached = getCachedProfile(authUser.id);
    if (cached) setProfile(cached);
    else setProfileLoading(true);

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user) {
          setProfile(d.user);
          setCachedProfile(d.user);
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [authUser?.id]);

  // Merge: DB profile fields override auth session fields (role, applicationStatus, etc.)
  const user: AuthUser | null = authUser
    ? { ...authUser, ...(profile ?? {}) }
    : null;

  return {
    user,
    loading: authLoading || (!!authUser && profileLoading && !profile),
    session,
  };
}
