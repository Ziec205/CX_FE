import type { Metadata } from "next";
import Link from "next/link";
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
        {/* Calibri có sẵn trên Windows; máy khác dùng Carlito (cùng số đo) để bố cục không lệch. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap" />
      </head>
      <body className="min-h-screen antialiased">
        <SiteChrome header={<Header />} footer={
        <footer className="mt-16 border-t border-stone-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
            <span className="text-lg font-bold text-emerald-800">Chạm<span className="font-normal italic text-wood-600"> Xanh</span></span>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/nha-vuon" className="hover:text-emerald-700">Dành cho Nhà vườn/Shop</Link>
              <Link href="/ban-do" className="hover:text-emerald-700">Bản đồ nhà vườn</Link>
              <Link href="/vi" className="hover:text-emerald-700">Ví Xu Xanh</Link>
              <Link href="/thu-vien" className="hover:text-emerald-700">Thư viện cây</Link>
              <Link href="/kham-pha" className="hover:text-emerald-700">Khám phá</Link>
              <Link href="/cong-dong" className="hover:text-emerald-700">Cộng đồng</Link>
              <Link href="/tim-bang-anh" className="hover:text-emerald-700">Tìm bằng ảnh</Link>
              <Link href="/ho-tro" className="hover:text-emerald-700">Trợ giúp</Link>
            </nav>
          </div>
        </footer>
        }>{children}</SiteChrome>
      </body>
    </html>
  );
}
