"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/admin/lib/api";

export interface AdminMe {
  id: string; username: string; displayName: string; roles: string[]; permissions: string[]; totpEnabled: boolean;
}

const Ctx = createContext<{ me: AdminMe | null; can: (perm: string) => boolean }>({ me: null, can: () => false });

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);
  useEffect(() => {
    let cancelled = false;
    api<AdminMe>("admin/auth/me").then((m) => { if (!cancelled) setMe(m); }, () => {});
    return () => { cancelled = true; };
  }, []);
  return <Ctx.Provider value={{ me, can: (p) => !!me?.permissions.includes(p) }}>{children}</Ctx.Provider>;
}

export const useAdmin = () => useContext(Ctx);
