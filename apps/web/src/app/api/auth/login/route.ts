import { API_URL, saveTokens, type TokenPair } from "@/lib/session";

export async function POST(req: Request) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: await req.text(), cache: "no-store",
  }).catch(() => null);
  if (!res) return Response.json({ code: "API_UNREACHABLE", message: "Không kết nối được máy chủ" }, { status: 502 });
  if (!res.ok) return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
  const data = (await res.json()) as { tokens: TokenPair; user: unknown; isNew: boolean };
  await saveTokens(data.tokens);
  return Response.json({ user: data.user, isNew: data.isNew }); // token không trả xuống trình duyệt
}
