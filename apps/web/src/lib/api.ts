export interface ApiError { code: string; message: string; details?: unknown; status?: number }

/** Gọi BE từ trình duyệt qua BFF /api/proxy (token nằm trong cookie httpOnly). */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const body = init?.json !== undefined ? JSON.stringify(init.json) : init?.body;
  const res = await fetch(`/api/proxy/${path.replace(/^\//, "")}`, {
    ...init,
    body,
    headers: typeof body === "string" ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const fallback = res.status === 401 ? "Vui lòng đăng nhập" : res.status === 403 ? "Bạn không có quyền thực hiện thao tác này" : "Có lỗi xảy ra";
    throw { ...(data ?? {}), message: data?.message ?? fallback, code: data?.code ?? String(res.status), status: res.status } as ApiError;
  }
  return data as T;
}

export async function uploadPhoto(file: File, kind = "ListingPhoto", capturedInApp = false): Promise<{ id: string; urls: Record<string, string> }> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  form.append("capturedInApp", String(capturedInApp));
  if (capturedInApp) form.append("capturedAt", new Date().toISOString());
  const res = await fetch("/api/proxy/media", { method: "POST", body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw { message: data?.message ?? "Tải ảnh thất bại", code: data?.code } as ApiError;
  return data;
}

export const errorText = (e: unknown) => {
  const err = e as ApiError;
  if (Array.isArray(err.details))
    return `${err.message}: ${(err.details as unknown[]).map((d) => (typeof d === "string" ? d : (d as { message?: string }).message)).join("; ")}`;
  return err.message ?? "Có lỗi xảy ra";
};

export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
