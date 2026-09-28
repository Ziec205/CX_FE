"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";

const NAV: { group: string; items: { href: string; label: string; perm: string }[] }[] = [
  { group: "Tổng quan", items: [
    { href: "/quan-tri/dashboard", label: "Dashboard & báo cáo", perm: "reports.view" },
  ] },
  { group: "Vận hành", items: [
    { href: "/quan-tri/moderation", label: "Kiểm duyệt tin", perm: "listing.moderate" },
    { href: "/quan-tri/members", label: "Người dùng", perm: "user.sanction" },
    { href: "/quan-tri/gardens", label: "Duyệt Nhà vườn/Shop", perm: "garden.verify" },
    { href: "/quan-tri/escrow", label: "Đơn đảm bảo & tranh chấp", perm: "reports.view" },
    { href: "/quan-tri/support", label: "Hỗ trợ khách hàng", perm: "dispute.resolve" },
  ] },
  { group: "Nội dung", items: [
    { href: "/quan-tri/explore", label: "Khám phá (bài hằng ngày)", perm: "content.manage" },
    { href: "/quan-tri/community", label: "Cộng đồng", perm: "content.manage" },
    { href: "/quan-tri/campaigns", label: "Chuyên trang mùa vụ", perm: "content.manage" },
  ] },
  { group: "Doanh thu", items: [
    { href: "/quan-tri/pricing", label: "Bảng giá & phí", perm: "pricing.view" },
    { href: "/quan-tri/wallets", label: "Ví Xu người dùng", perm: "wallet.adjust" },
    { href: "/quan-tri/payouts", label: "Quyết toán người bán", perm: "payout.approve" },
  ] },
  { group: "Hệ thống", items: [
    { href: "/quan-tri/features", label: "Bật/tắt tính năng", perm: "admin.manage" },
    { href: "/quan-tri/admins", label: "Tài khoản quản trị", perm: "admin.manage" },
    { href: "/quan-tri/audit", label: "Nhật ký audit", perm: "reports.view" },
  ] },
];

export function Sidebar() {
  const { me, can } = useAdmin();
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin-auth/logout", { method: "POST" });
    router.replace("/dang-nhap?admin=1");
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white p-4">
      <div className="mb-6 text-lg font-semibold text-emerald-700">🌿 Chạm Xanh Admin</div>
      <nav className="flex-1 space-y-4 text-sm">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(i.perm));
          if (items.length === 0) return null;
          return (
            <div key={g.group}>
              <p className="px-2 pb-1 text-xs font-medium uppercase text-stone-400">{g.group}</p>
              {items.map((i) => (
                <Link key={i.href} href={i.href}
                  className={`block rounded px-2 py-1.5 ${path.startsWith(i.href) ? "bg-emerald-50 font-medium text-emerald-800" : "hover:bg-stone-50"}`}>
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
          {!me.totpEnabled && (
            <Link href="/quan-tri/security" className="mt-2 block rounded bg-amber-50 px-2 py-1 text-amber-800">⚠ Chưa bật 2FA — bật ngay</Link>
          )}
          <div className="mt-2 flex gap-3">
            <Link href="/quan-tri/security" className="hover:text-emerald-700">Bảo mật</Link>
            <button onClick={logout} className="hover:text-red-700">Đăng xuất</button>
          </div>
        </div>
      )}
    </aside>
  );
}
