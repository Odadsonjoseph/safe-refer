import { useAuth } from "../lib/auth";

// Convenience wrapper — returns { user, loading, session }
export function useSession() {
  return useAuth();
}
