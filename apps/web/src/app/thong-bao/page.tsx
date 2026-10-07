"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, btn } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>();
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-emerald-900">Thông báo</h1>
          <div className="flex gap-2">
            <Link href="/cai-dat" className={btn.small}>Cài đặt</Link>
            <button onClick={readAll} className={btn.small}>Đánh dấu đã đọc hết</button>
          </div>
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
    </div>
  );
}
