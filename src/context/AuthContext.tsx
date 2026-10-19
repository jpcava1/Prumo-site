import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type AuthUser, type Profile } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const p = await api.getProfile().catch(() => null);
    setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    let active = true;
    api.getUser().then(async (u) => {
      if (!active) return;
      setUser(u);
      if (u) await refreshProfile();
      setLoading(false);
    });
    const off = api.onAuthChange(async (u) => {
      setUser(u);
      if (u) await refreshProfile();
      else setProfile(null);
    });
    return () => {
      active = false;
      off();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({ user, profile, loading, refreshProfile, signOut }), [user, profile, loading, refreshProfile, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

export function isProfileComplete(p: Profile | null): boolean {
  return !!(p && p.full_name && p.cpf && p.birth_date && p.phone);
}
