"use client";

import { usePathname } from "next/navigation";

/** Header/footer của trang người dùng; khu quản trị (/quan-tri) có sidebar riêng nên ẩn đi. */
export function SiteChrome({ header, footer, tabBar, children }: { header: React.ReactNode; footer: React.ReactNode; tabBar?: React.ReactNode; children: React.ReactNode }) {
  const admin = usePathname().startsWith("/quan-tri");
  if (admin) return <>{children}</>;
  return (
    <>
      {header}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      {/* Chừa chỗ cho thanh tab dưới đáy trên điện thoại. */}
      <div className="pb-16 md:pb-0">{footer}</div>
      {tabBar}
    </>
  );
}
