import { NextResponse, type NextRequest } from "next/server";

// Trang cần đăng nhập: chưa có phiên thì chuyển sang đăng nhập, kèm đường dẫn quay lại.
// Khu quản trị (/quan-tri) dùng phiên admin riêng (cookie cxa_*), không dùng chung phiên thành viên.
export function proxy(request: NextRequest) {
  const admin = request.nextUrl.pathname.startsWith("/quan-tri");
  const hasSession = admin
    ? request.cookies.has("cxa_at") || request.cookies.has("cxa_rt")
    : request.cookies.has("cxw_at") || request.cookies.has("cxw_rt");
  if (hasSession) return NextResponse.next();
  const url = new URL("/dang-nhap", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  if (admin) url.searchParams.set("admin", "1");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dang-tin/:path*", "/tai-khoan/:path*", "/tin-nhan/:path*", "/vi/:path*", "/yeu-thich/:path*", "/nha-vuon/:path*",
    "/vuon-cua-toi/:path*", "/thong-bao/:path*", "/don-hang/:path*", "/thue/:path*", "/cong-dong/dang-bai", "/tin/:id/bao-gia",
    "/tro-ly-ai", "/tro-ly-ai/:path*", "/cai-dat", "/goi/gia-lap",
    "/quan-tri", "/quan-tri/:path*",
  ],
};
