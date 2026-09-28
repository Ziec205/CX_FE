"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, Section, btn, field } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { vnd } from "@/lib/format";

interface Rental {
  id: string; listingId: string; ownerId: string; renterId: string; quantity: number; startDate: string; endDate: string;
  priceEstimate: number; deposit: number; note?: string | null; deliveryAddress?: string | null; status: string; responseNote?: string | null;
}
const STATUS: Record<string, string> = {
  Requested: "Chờ chủ cây xác nhận", Accepted: "Đã nhận lịch", Declined: "Bị từ chối", Cancelled: "Đã hủy", Active: "Đang thuê", Returned: "Đã trả cây",
};

export default function RentalPage() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Rental>();
  const [me, setMe] = useState<string>();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(() => { api<Rental>(`rentals/${id}`).then(setR, (e) => setError(errorText(e))); }, [id]);
  useEffect(load, [load]);
  useEffect(() => { api<{ id: string }>("me").then((m) => setMe(m.id), () => {}); }, []);

  async function act(path: string, json?: unknown) {
    setError(undefined);
    try { await api(`rentals/${id}/${path}`, { method: "POST", json: json ?? {} }); load(); } catch (e) { setError(errorText(e)); }
  }

  if (!r) return error ? <Alert>{error}</Alert> : <p className="text-stone-500">Đang tải…</p>;
  const owner = me === r.ownerId;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/thue" className="text-sm text-emerald-700 hover:underline">← Lịch thuê</Link>
      <h1 className="text-3xl tracking-tight text-emerald-800">{STATUS[r.status] ?? r.status}</h1>
      {error && <Alert>{error}</Alert>}
      <Section title="Chi tiết">
        <dl className="space-y-1.5 text-[15px]">
          <div><dt className="inline text-stone-500">Thời gian: </dt><dd className="inline">{new Date(r.startDate).toLocaleDateString("vi-VN")} – {new Date(r.endDate).toLocaleDateString("vi-VN")}</dd></div>
          <div><dt className="inline text-stone-500">Số lượng: </dt><dd className="inline">{r.quantity}</dd></div>
          <div><dt className="inline text-stone-500">Tiền thuê dự kiến: </dt><dd className="inline">{vnd(r.priceEstimate)}</dd></div>
          <div><dt className="inline text-stone-500">Tiền cọc: </dt><dd className="inline">{vnd(r.deposit)}</dd></div>
          {r.deliveryAddress && <div><dt className="inline text-stone-500">Địa chỉ: </dt><dd className="inline">{r.deliveryAddress}</dd></div>}
          {r.note && <div><dt className="inline text-stone-500">Ghi chú: </dt><dd className="inline">{r.note}</dd></div>}
          {r.responseNote && <div><dt className="inline text-stone-500">Phản hồi: </dt><dd className="inline">{r.responseNote}</dd></div>}
        </dl>
        <Link href={`/tin/${r.listingId}`} className="mt-3 inline-block text-emerald-700 hover:underline">Xem tin cho thuê</Link>
      </Section>
      <p className="text-sm text-stone-500">Tiền thuê và cọc do hai bên tự thỏa thuận thanh toán. Hãy nhắn tin để chốt giờ giao và cách trả cọc.</p>
      <div className="flex flex-wrap gap-2">
        {owner && r.status === "Requested" && <>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lời nhắn cho người thuê (tùy chọn)" className={field} />
          <button onClick={() => act("respond", { accept: true, note })} className={btn.primary}>Nhận lịch</button>
          <button onClick={() => act("respond", { accept: false, note })} className={btn.danger}>Từ chối</button>
        </>}
        {owner && r.status === "Accepted" && <button onClick={() => act("handover")} className={btn.primary}>Đã giao cây</button>}
        {owner && r.status === "Active" && <button onClick={() => act("returned")} className={btn.primary}>Đã nhận lại cây</button>}
        {(r.status === "Requested" || r.status === "Accepted") && <button onClick={() => { if (confirm("Hủy lịch thuê này?")) act("cancel"); }} className={btn.secondary}>Hủy lịch</button>}
      </div>
    </div>
  );
}
