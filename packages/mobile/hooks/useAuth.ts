import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { clearToken, getToken, type AuthUser } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await (api.users.me.$get() as Promise<Response>);
      if (res.ok) {
        const data: any = await res.json();
        setUser(data.user ?? null);
      } else {
        await clearToken();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { user, loading, setUser, refresh };
}
