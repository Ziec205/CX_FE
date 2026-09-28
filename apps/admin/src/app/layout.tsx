import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Chạm Xanh Admin" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
