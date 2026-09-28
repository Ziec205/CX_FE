import { cookies } from "next/headers";

// BFF: token JWT chỉ nằm trong cookie httpOnly.
export const API_URL = process.env.API_URL ?? "http://localhost:5080";
export const ACCESS_COOKIE = "cxw_at";
export const REFRESH_COOKIE = "cxw_rt";

export interface TokenPair { accessToken: string; accessTokenExpiresAt: string; refreshToken: string }

const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function saveTokens(t: TokenPair) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, t.accessToken, { ...base, maxAge: 60 * 30 });
  jar.set(REFRESH_COOKIE, t.refreshToken, { ...base, maxAge: 60 * 60 * 24 * 60 });
}

export async function clearTokens() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function isSignedIn() {
  const jar = await cookies();
  return jar.has(ACCESS_COOKIE) || jar.has(REFRESH_COOKIE);
}

async function refreshTokens(): Promise<string | null> {
  const jar = await cookies();
  const rt = jar.get(REFRESH_COOKIE)?.value;
  if (!rt) return null;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: rt }), cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) {
    await clearTokens();
    return null;
  }
  const pair = (await res.json()) as TokenPair;
  await saveTokens(pair);
  return pair.accessToken;
}

/** Gọi BE kèm token trong cookie; 401 thì làm mới token một lần rồi thử lại. */
export async function callApi(path: string, init: { method?: string; rawBody?: BodyInit; contentType?: string | null } = {}) {
  const jar = await cookies();
  let token = jar.get(ACCESS_COOKIE)?.value ?? null;
  if (!token && jar.has(REFRESH_COOKIE)) token = await refreshTokens();
  const send = (t: string | null) => {
    const headers: Record<string, string> = {};
    if (init.contentType) headers["Content-Type"] = init.contentType;
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(`${API_URL}${path}`, { method: init.method ?? "GET", headers, body: init.rawBody, cache: "no-store" });
  };
  let res = await send(token);
  if (res.status === 401 && jar.has(REFRESH_COOKIE)) {
    const fresh = await refreshTokens();
    if (fresh) res = await send(fresh);
  }
  return res;
}
