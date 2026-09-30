"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Section, btn } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

const GROUP_LABEL: Record<string, string> = {
  chat: "Tin nhắn", listing: "Tin đăng, báo giá, thuê cây", discovery: "Tìm kiếm đã lưu, yêu thích, theo dõi",
  community: "Cộng đồng", care: "Nhắc chăm cây", marketing: "Khuyến mãi, gợi ý",
  transaction: "Giao dịch (không tắt được)", security: "Bảo mật tài khoản (không tắt được)",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>();
  const [groups, setGroups] = useState<Record<string, boolean>>();
  const [error, setError] = useState<string>();
  const [more, setMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ items: AppNotification[] }>("me/notifications").then((r) => {
      if (cancelled) return;
      setItems(r.items);
      setMore(r.items.length === 30);
    }, (e) => {
      if ((e as ApiError).status === 401) router.push("/dang-nhap?next=/thong-bao");
      else if (!cancelled) setError(errorText(e));
    });
    api<Record<string, boolean>>("me/notifications/settings").then((g) => { if (!cancelled) setGroups(g); }, () => {});
    return () => { cancelled = true; };
  }, [router]);

  async function loadMore() {
    const last = items?.at(-1);
    if (!last) return;
    const r = await api<{ items: AppNotification[] }>(`me/notifications?before=${encodeURIComponent(last.createdAt)}`);
    setItems([...(items ?? []), ...r.items]);
    setMore(r.items.length === 30);
  }

  async function open(n: AppNotification) {
    if (!n.readAt) api(`me/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    if (n.link) router.push(n.link);
    else setItems(items?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
  }

  async function readAll() {
    await api("me/notifications/read-all", { method: "POST" });
    setItems(items?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
  }

  async function toggle(group: string) {
    if (!groups || group === "transaction" || group === "security") return;
    try { setGroups(await api<Record<string, boolean>>("me/notifications/settings", { method: "PUT", json: { groups: { [group]: !groups[group] } } })); }
    catch (e) { setError(errorText(e)); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-emerald-900">Thông báo</h1>
          <button onClick={readAll} className={btn.small}>Đánh dấu đã đọc hết</button>
        </div>
        {error && <Alert>{error}</Alert>}
        {items?.length === 0 && <p className="text-stone-500">Chưa có thông báo nào.</p>}
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {items?.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-stone-50 ${n.readAt ? "" : "bg-emerald-50/60"}`}>
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-emerald-600"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-stone-900">{n.title}</span>
                  {n.body && <span className="block text-sm text-stone-600">{n.body}</span>}
                  <span className="block text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {more && items && items.length > 0 && <button onClick={loadMore} className={btn.secondary}>Xem thêm</button>}
      </div>
      <aside>
        <Section title="Cài đặt">
          <p className="mb-3 text-sm text-stone-500">Chọn nhóm thông báo muốn nhận trên điện thoại. Thông báo trong app luôn được lưu tại đây.</p>
          <ul className="space-y-2">
            {groups && Object.entries(GROUP_LABEL).map(([g, label]) => (
              <li key={g}>
                <label className="flex items-center gap-2 text-[15px]">
                  <input type="checkbox" checked={groups[g] ?? true} disabled={g === "transaction" || g === "security"} onChange={() => toggle(g)} className="h-4 w-4 accent-emerald-700" />
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <Link href="/vuon-cua-toi" className="mt-4 block text-sm text-emerald-700 hover:underline">Quản lý lịch nhắc chăm cây →</Link>
        </Section>
      </aside>
    </div>
  );
}
