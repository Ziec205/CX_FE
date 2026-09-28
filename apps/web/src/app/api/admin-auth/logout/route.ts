import { cookies } from "next/headers";
import { API_URL, REFRESH_COOKIE, clearTokens } from "@/admin/lib/session";

export async function POST() {
  const rt = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (rt)
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    }).catch(() => null);
  await clearTokens();
  return Response.json({ ok: true });
}
