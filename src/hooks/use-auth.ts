"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/pg/browser-client";
import { UserRole } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

/**
 * Hook for accessing the current authenticated user.
 * Returns null when no active session exists.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = createBrowserClient();

    // Try to get session
    db.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? "",
          role: (u.user_metadata?.role as UserRole) ?? "purchasing_staff",
          full_name: u.user_metadata?.full_name,
          avatar_url: u.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? "",
          role: (u.user_metadata?.role as UserRole) ?? "purchasing_staff",
          full_name: u.user_metadata?.full_name,
          avatar_url: u.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const db = createBrowserClient();
    await db.auth.signOut();
    setUser(null);
  }

  return { user, loading, signOut };
}
