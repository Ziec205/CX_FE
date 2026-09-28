import { NextResponse, type NextRequest } from "next/server";

// Chưa có phiên đăng nhập thì chuyển về trang đăng nhập (kiểm tra quyền chi tiết do BE làm).
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("cxa_at") || request.cookies.has("cxa_rt");
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|media|favicon.ico).*)"],
};
