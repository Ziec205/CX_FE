import { API_URL } from "@/lib/session";

export async function POST(req: Request) {
  const res = await fetch(`${API_URL}/api/auth/otp/request`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: await req.text(), cache: "no-store",
  }).catch(() => null);
  if (!res) return Response.json({ code: "API_UNREACHABLE", message: "Không kết nối được máy chủ" }, { status: 502 });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
