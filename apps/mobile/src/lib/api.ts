import { Platform } from "react-native";
import { API_URL } from "./config";
import { deleteItem, getItem, setItem } from "./storage";

export interface ApiError { code: string; message: string; details?: unknown; status?: number }
export interface TokenPair { accessToken: string; accessTokenExpiresAt: string; refreshToken: string }

const ACCESS = "cx.at";
const REFRESH = "cx.rt";
let onSignedOut: (() => void) | undefined;
export const setSignedOutHandler = (fn: () => void) => { onSignedOut = fn; };

export async function saveTokens(t: TokenPair) {
  await setItem(ACCESS, t.accessToken);
  await setItem(REFRESH, t.refreshToken);
}
export async function clearTokens() {
  await deleteItem(ACCESS);
  await deleteItem(REFRESH);
}
export const hasSession = async () => !!(await getItem(REFRESH));

let refreshing: Promise<string | null> | null = null;
async function refresh(): Promise<string | null> {
  // Gộp các lần làm mới đồng thời (nhiều request cùng gặp 401) thành một, vì refresh token xoay vòng chỉ dùng được 1 lần.
  refreshing ??= (async () => {
    const rt = await getItem(REFRESH);
    if (!rt) return null;
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: rt }),
    }).catch(() => null);
    if (!res?.ok) {
      await clearTokens();
      onSignedOut?.();
      return null;
    }
    const pair = (await res.json()) as TokenPair;
    await saveTokens(pair);
    return pair.accessToken;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function accessToken() {
  return (await getItem(ACCESS)) ?? (await refresh());
}

export async function api<T>(path: string, init: { method?: string; json?: unknown; body?: BodyInit; auth?: boolean } = {}): Promise<T> {
  const send = async (token: string | null) => {
    const headers: Record<string, string> = {};
    if (init.json !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}/api/${path.replace(/^\//, "")}`, {
      method: init.method ?? "GET", headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
  };
  const wantsAuth = init.auth !== false;
  let res = await send(wantsAuth ? await getItem(ACCESS) : null).catch(() => null);
  if (res?.status === 401 && wantsAuth) {
    const fresh = await refresh();
    if (fresh) res = await send(fresh).catch(() => null);
  }
  if (!res) throw { code: "NETWORK", message: "Không kết nối được máy chủ" } as ApiError;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const fallback = res.status === 401 ? "Vui lòng đăng nhập" : res.status === 403 ? "Bạn không có quyền thực hiện thao tác này" : "Có lỗi xảy ra";
    throw { ...(data ?? {}), message: data?.message ?? fallback, code: data?.code ?? String(res.status), status: res.status } as ApiError;
  }
  return data as T;
}

/** Tải ảnh lên. capturedInApp=true khi ảnh chụp bằng camera trong app (nhãn "Ảnh chụp thực tế"). */
export async function uploadPhoto(asset: { uri: string; mimeType?: string | null; fileName?: string | null }, capturedInApp: boolean, kind = "ListingPhoto") {
  const form = new FormData();
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  if (Platform.OS === "web") form.append("file", await (await fetch(asset.uri)).blob(), name);
  else form.append("file", { uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
  form.append("kind", kind);
  form.append("capturedInApp", String(capturedInApp));
  if (capturedInApp) form.append("capturedAt", new Date().toISOString());
  return api<{ id: string; urls: Record<string, string> }>("media", { method: "POST", body: form });
}

export const errorText = (e: unknown) => {
  const err = e as ApiError;
  if (Array.isArray(err.details))
    return `${err.message}:\n• ${(err.details as unknown[]).map((d) => (typeof d === "string" ? d : (d as { message?: string }).message)).join("\n• ")}`;
  return err.message ?? "Có lỗi xảy ra";
};

export const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
