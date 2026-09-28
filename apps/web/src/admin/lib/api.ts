export interface ApiError { code: string; message: string; details?: unknown; status?: number }

/** Gọi BE qua BFF /api/proxy (token nằm trong cookie httpOnly). */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const body = init?.json !== undefined ? JSON.stringify(init.json) : init?.body;
  const res = await fetch(`/api/admin-proxy/${path.replace(/^\//, "")}`, {
    ...init,
    body,
    headers: typeof body === "string" ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    // Hết phiên: tải lại toàn trang về /login (hàm dùng ngoài component nên không có router)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dang-nhap?admin=1");
    throw { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn", status: 401 } as ApiError;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const fallback = res.status === 403 ? "Bạn không có quyền thực hiện thao tác này" : res.statusText;
    throw { ...(data ?? {}), message: data?.message ?? fallback, code: data?.code ?? String(res.status), status: res.status } as ApiError;
  }
  return data as T;
}

export const errorText = (e: unknown) => {
  const err = e as ApiError;
  if (Array.isArray(err.details)) return `${err.message}: ${(err.details as unknown[]).map((d) => (typeof d === "string" ? d : (d as { message?: string }).message)).join("; ")}`;
  return err.message ?? "Có lỗi xảy ra";
};

export const formatVnd = (n?: number | null) => (n == null ? "—" : n.toLocaleString("vi-VN") + "đ");
export const formatDate = (s?: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : "—");
