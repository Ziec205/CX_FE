import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearTokens, hasSession, saveTokens, setSignedOutHandler, type TokenPair } from "./api";
import type { Me } from "./types";

interface AuthState {
  me: Me | null;
  loading: boolean;
  signIn: (tokens: TokenPair) => Promise<Me>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  setMe: (m: Me) => void;
}

async function fetchMe(): Promise<Me | null> {
  try { return (await hasSession()) ? await api<Me>("me") : null; }
  catch { return null; }
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => setMe(await fetchMe()), []);

  useEffect(() => {
    setSignedOutHandler(() => setMe(null));
    let cancelled = false;
    fetchMe().then((m) => { if (!cancelled) { setMe(m); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const signIn = async (tokens: TokenPair) => {
    await saveTokens(tokens);
    const m = await api<Me>("me");
    setMe(m);
    return m;
  };

  const signOut = async () => {
    await clearTokens();
    setMe(null);
  };

  return <Ctx.Provider value={{ me, loading, signIn, signOut, reload, setMe }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
