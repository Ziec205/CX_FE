import "server-only";
import { API_URL } from "./session";

/** Lấy dữ liệu công khai phía server (SSR/ISR, tốt cho SEO). Trả null khi lỗi để trang vẫn hiển thị.
 *  Timeout 8s: Render free ngủ ~50s, không để build/SSR treo chờ backend. */
export async function publicGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
