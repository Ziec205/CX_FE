"use client";

import { usePathname } from "next/navigation";

/** Header/footer của trang người dùng; khu quản trị (/quan-tri) có sidebar riêng nên ẩn đi.
 *  Cột flex cao tối thiểu một màn hình: trang ít nội dung thì footer vẫn nằm sát đáy. */
export function SiteChrome({ header, footer, tabBar, children }: { header: React.ReactNode; footer: React.ReactNode; tabBar?: React.ReactNode; children: React.ReactNode }) {
  const admin = usePathname().startsWith("/quan-tri");
  if (admin) return <>{children}</>;
  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      {/* Chừa chỗ cho thanh tab dưới đáy trên điện thoại. */}
      <div className="pb-16 md:pb-0">{footer}</div>
      {tabBar}
    </div>
  );
}
