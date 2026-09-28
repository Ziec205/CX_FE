import { NextResponse, type NextRequest } from "next/server";

// Trang cần đăng nhập: chưa có phiên thì chuyển sang đăng nhập, kèm đường dẫn quay lại.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("cxw_at") || request.cookies.has("cxw_rt");
  if (hasSession) return NextResponse.next();
  const url = new URL("/dang-nhap", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dang-tin/:path*", "/tai-khoan/:path*", "/tin-nhan/:path*", "/vi/:path*", "/yeu-thich/:path*", "/nha-vuon/:path*",
    "/vuon-cua-toi/:path*", "/thong-bao/:path*", "/don-hang/:path*", "/thue/:path*", "/cong-dong/dang-bai", "/tin/:id/bao-gia",
  ],
};
