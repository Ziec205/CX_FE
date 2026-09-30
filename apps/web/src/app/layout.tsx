import type { Metadata } from "next";
import Link from "next/link";
import { FeatureTabBar } from "@/components/FeatureNav";
import { Header } from "@/components/Header";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Chạm Xanh — Chợ cây trồng", template: "%s | Chạm Xanh" },
  description: "Mua bán, thuê, trao đổi cây cảnh, bonsai, cây giống và vật tư làm vườn gần bạn, từ người bán tin cậy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        {/* Be Vietnam Pro vẽ riêng cho dấu tiếng Việt; Bricolage Grotesque cho tiêu đề. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap" />
      </head>
      <body className="min-h-screen antialiased">
        <SiteChrome header={<Header />} tabBar={<FeatureTabBar />} footer={
        <footer className="mt-16 bg-emerald-900 text-emerald-100">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-10">
            <div className="space-y-2">
              <span className="font-display text-2xl font-bold text-white">Chạm Xanh</span>
              <p className="max-w-xs text-emerald-200">Chợ cây của người trồng cây, từ ban công thành phố tới nhà vườn miền Tây.</p>
            </div>
            <nav aria-label="Chân trang" className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <Link href="/cho-cay" className="hover:text-white">Chợ cây</Link>
              <Link href="/kham-pha" className="hover:text-white">Khám phá</Link>
              <Link href="/vuon-cua-toi" className="hover:text-white">Hồ sơ vườn</Link>
              <Link href="/cong-dong" className="hover:text-white">Cộng đồng</Link>
              <Link href="/thu-vien" className="hover:text-white">Thư viện cây</Link>
              <Link href="/tim-bang-anh" className="hover:text-white">Tìm bằng ảnh</Link>
              <Link href="/ban-do" className="hover:text-white">Bản đồ nhà vườn</Link>
              <Link href="/nha-vuon" className="hover:text-white">Dành cho Nhà vườn/Shop</Link>
              <Link href="/vi" className="hover:text-white">Ví Xu Xanh</Link>
              <Link href="/ho-tro" className="hover:text-white">Trợ giúp</Link>
            </nav>
          </div>
        </footer>
        }>{children}</SiteChrome>
      </body>
    </html>
  );
}
