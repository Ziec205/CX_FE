"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { ORDER_STATUS, TONE_CLASS } from "@/lib/escrow";
import { vnd } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [items, setItems] = useState<OrderSummary[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    api<OrderSummary[]>(`escrow/orders?role=${role}`).then((r) => { if (!cancelled) setItems(r); }, (e) => {
      if ((e as ApiError).status === 401) router.push("/dang-nhap?next=/don-hang");
      else if (!cancelled) setError(errorText(e));
    });
    return () => { cancelled = true; };
  }, [role, router]);

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-extrabold text-emerald-900">Đơn đảm bảo</h1>
      <div className="flex gap-2">
        {(["buyer", "seller"] as const).map((r) => (
          <button key={r} onClick={() => { setItems(undefined); setRole(r); }}
            className={`rounded-full px-4 py-2 ${role === r ? "bg-emerald-800 text-white" : "border border-stone-300 bg-white"}`}>
            {r === "buyer" ? "Tôi mua" : "Tôi bán"}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {items?.length === 0 && <p className="text-stone-500">Chưa có đơn nào.</p>}
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {items?.map((o) => {
          const s = ORDER_STATUS[o.status];
          return (
            <li key={o.id}>
              <Link href={`/don-hang/${o.id}`} className="flex items-center gap-4 p-4 hover:bg-stone-50">
                {o.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.thumbUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ) : <div className="h-16 w-16 rounded-lg bg-stone-100" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{o.listingTitle}</p>
                  <p className="text-sm text-stone-500">Mã {o.code} · SL {o.quantity} · {new Date(o.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-800">{vnd(o.total)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${TONE_CLASS[s.tone]}`}>{s.label}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
