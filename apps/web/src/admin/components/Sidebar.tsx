"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";

const NAV: { group: string; items: { href: string; label: string; perm: string }[] }[] = [
  { group: "Tổng quan", items: [
    { href: "/quan-tri/dashboard", label: "Dashboard & báo cáo", perm: "reports.view" },
  ] },
  { group: "Vận hành", items: [
    { href: "/quan-tri/moderation", label: "Kiểm duyệt tin", perm: "listing.moderate" },
    { href: "/quan-tri/members", label: "Người dùng", perm: "user.sanction" },
    { href: "/quan-tri/support", label: "Hỗ trợ khách hàng", perm: "dispute.resolve" },
  ] },
  { group: "Nội dung", items: [
    { href: "/quan-tri/explore", label: "Khám phá (bài hằng ngày)", perm: "content.manage" },
    { href: "/quan-tri/community", label: "Cộng đồng", perm: "content.manage" },
    { href: "/quan-tri/campaigns", label: "Chuyên trang mùa vụ", perm: "content.manage" },
  ] },
  { group: "Doanh thu", items: [
    { href: "/quan-tri/pricing", label: "Bảng giá & phí", perm: "pricing.view" },
    { href: "/quan-tri/plans", label: "Gói & thanh toán", perm: "reports.view" },
    { href: "/quan-tri/wallets", label: "Ví Xu người dùng", perm: "wallet.adjust" },
  ] },
  { group: "Hệ thống", items: [
    { href: "/quan-tri/features", label: "Bật/tắt tính năng", perm: "admin.manage" },
    { href: "/quan-tri/admins", label: "Tài khoản quản trị", perm: "admin.manage" },
    { href: "/quan-tri/agent-tokens", label: "Token trợ lý AI", perm: "admin.manage" },
    { href: "/quan-tri/audit", label: "Nhật ký audit", perm: "reports.view" },
  ] },
];

export function Sidebar() {
  const { me, can } = useAdmin();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin-auth/logout", { method: "POST" });
    router.replace("/dang-nhap?admin=1");
  }

  return (
    <aside className="flex shrink-0 flex-col border-b border-stone-300 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="flex items-center justify-between md:mb-6">
        <div className="flex items-center gap-2 text-lg font-bold text-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain" /> Chạm Xanh Admin
        </div>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-full bg-[#efedec] px-3 py-1 text-sm md:hidden">{open ? "Đóng" : "Menu"}</button>
      </div>
      <div className={`${open ? "mt-4 flex" : "hidden"} flex-1 flex-col md:flex`}>
      <nav className="flex-1 space-y-4 text-sm">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(i.perm));
          if (items.length === 0) return null;
          return (
            <div key={g.group}>
              <p className="px-2 pb-1 text-xs font-medium uppercase text-stone-400">{g.group}</p>
              {items.map((i) => (
                <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
                  className={`block rounded-full px-3 py-1.5 ${path.startsWith(i.href) ? "bg-[#c9e8bf] font-semibold text-[#2d5a27]" : "hover:bg-stone-50"}`}>
                  {i.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      {me && (
        <div className="border-t border-stone-100 pt-3 text-xs text-stone-500">
          <div className="font-medium text-stone-800">{me.displayName}</div>
          <div>{me.roles.join(", ")}</div>
          <div className="mt-2 flex gap-3">
            <Link href="/quan-tri/security" className="hover:text-emerald-700">Bảo mật</Link>
            <button onClick={logout} className="hover:text-red-700">Đăng xuất</button>
          </div>
        </div>
      )}
      </div>
    </aside>
  );
}
