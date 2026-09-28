import { NextRequest } from "next/server";
import { callApi } from "@/admin/lib/session";

async function forward(req: NextRequest, ctx: RouteContext<"/api/admin-proxy/[...path]">) {
  const { path } = await ctx.params;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  try {
    const res = await callApi(`/api/${path.join("/")}${req.nextUrl.search}`, {
      method: req.method,
      rawBody: body,
      contentType: req.headers.get("content-type"),
    });
    return new Response(res.status === 204 ? null : await res.arrayBuffer(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ code: "API_UNREACHABLE", message: "Không kết nối được máy chủ API" }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
