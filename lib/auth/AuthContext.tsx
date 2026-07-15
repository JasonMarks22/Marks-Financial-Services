"use client";

/**
 * Shared "who is logged in" state for the whole app.
 *
 * This is a React context backed by Supabase Auth:
 *   - On first load it asks Supabase for the current session (if any).
 *   - It subscribes to Supabase auth-state changes, so when the user logs in,
 *     logs out, or their token refreshes, every component reading this context
 *     updates live — no page reload needed.
 *   - It exposes `user` (the Supabase User object, or null when logged out)
 *     and `loading` (true only during the initial session check, so pages can
 *     avoid flashing "logged out" UI before the session is known).
 *
 * Usage:
 *   const { user, loading } = useAuth();
 *
 * NOTE: nothing here ever sees or stores a password — all credential handling
 * lives inside Supabase Auth itself.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  /** The currently logged-in Supabase user, or null when logged out. */
  user: User | null;
  /** True while the initial "is anyone logged in?" check is still running. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Initial check: is there an existing session (e.g. from a previous
    //    visit)? Supabase persists sessions in localStorage by default.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2) Live updates: fires on SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.,
    //    keeping the whole app in sync without a reload.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Clean up the listener when the provider unmounts.
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — read the current auth state anywhere in the app. */
export function useAuth() {
  return useContext(AuthContext);
}
