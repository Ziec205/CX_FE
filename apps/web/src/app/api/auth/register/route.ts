import { API_URL, saveTokens, type TokenPair } from "@/lib/session";

export async function POST(req: Request) {
  // Chuyển IP người dùng cho BE để giới hạn đăng ký theo IP; BE chỉ tin khi BFF_SECRET khớp Auth__BffSecret.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.BFF_SECRET;
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (secret && ip) { headers["X-Bff-Secret"] = secret; headers["X-Client-IP"] = ip; }

  const res = await fetch(`${API_URL}/api/auth/register`, { method: "POST", headers, body: await req.text(), cache: "no-store" }).catch(() => null);
  if (!res) return Response.json({ code: "API_UNREACHABLE", message: "Không kết nối được máy chủ" }, { status: 502 });
  if (!res.ok) return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
  const data = (await res.json()) as { tokens: TokenPair; user: unknown; isNew: boolean };
  await saveTokens(data.tokens);
  return Response.json({ user: data.user, isNew: data.isNew }); // token không trả xuống trình duyệt
}
