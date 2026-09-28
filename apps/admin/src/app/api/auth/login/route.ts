import { API_URL, saveTokens, type TokenPair } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${API_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  }).catch(() => null);
  if (!res) return Response.json({ code: "API_UNREACHABLE", message: "Không kết nối được máy chủ API" }, { status: 502 });
  if (!res.ok) return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
  await saveTokens((await res.json()) as TokenPair);
  return Response.json({ ok: true });
}
