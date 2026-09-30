"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { vnd } from "@/lib/format";

interface Rental {
  id: string; listingId: string; ownerId: string; renterId: string; quantity: number; startDate: string; endDate: string;
  priceEstimate: number; deposit: number; note?: string | null; deliveryAddress?: string | null; status: string; responseNote?: string | null; createdAt: string;
}

const RENTAL_STATUS: Record<string, string> = {
  Requested: "Chờ chủ cây xác nhận", Accepted: "Đã nhận lịch", Declined: "Bị từ chối", Cancelled: "Đã hủy", Active: "Đang thuê", Returned: "Đã trả cây",
};

export default function RentalsPage() {
  const router = useRouter();
  const [role, setRole] = useState<"renter" | "owner">("renter");
  const [items, setItems] = useState<Rental[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    api<Rental[]>(`me/rentals?role=${role}`).then((r) => { if (!cancelled) setItems(r); }, (e) => {
      if ((e as ApiError).status === 401) router.push("/dang-nhap?next=/thue");
      else if (!cancelled) setError(errorText(e));
    });
    return () => { cancelled = true; };
  }, [role, router]);

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-extrabold text-emerald-900">Lịch thuê cây</h1>
      <div className="flex gap-2">
        {(["renter", "owner"] as const).map((r) => (
          <button key={r} onClick={() => { setItems(undefined); setRole(r); }} className={`rounded-full px-4 py-2 ${role === r ? "bg-emerald-800 text-white" : "border border-stone-300 bg-white"}`}>
            {r === "renter" ? "Tôi thuê" : "Cây tôi cho thuê"}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {items?.length === 0 && <p className="text-stone-500">Chưa có lịch thuê.</p>}
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {items?.map((r) => (
          <li key={r.id}>
            <Link href={`/thue/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-stone-50">
              <span>{new Date(r.startDate).toLocaleDateString("vi-VN")} – {new Date(r.endDate).toLocaleDateString("vi-VN")} · SL {r.quantity}</span>
              <span className="text-sm">{vnd(r.priceEstimate)} · <b>{RENTAL_STATUS[r.status] ?? r.status}</b></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
