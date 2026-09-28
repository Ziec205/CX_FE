"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, Label, Section, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { priceLabel, vnd } from "@/lib/format";
import type { ListingDetail, RentTerms } from "@/lib/types";

interface Calendar { quantity: number; rent: RentTerms; busyDays: { date: string; available: number }[] }

export default function NewRentalPage() {
  return <Suspense><NewRental /></Suspense>;
}

function NewRental() {
  const router = useRouter();
  const listingId = useSearchParams().get("listing");
  const [listing, setListing] = useState<ListingDetail>();
  const [cal, setCal] = useState<Calendar>();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    api<ListingDetail>(`listings/${listingId}`).then((l) => { if (!cancelled) setListing(l); }, (e) => { if (!cancelled) setError(errorText(e)); });
    api<Calendar>(`listings/${listingId}/rental-calendar`).then((c) => { if (!cancelled) setCal(c); }, () => {});
    return () => { cancelled = true; };
  }, [listingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await api(`listings/${listingId}/rentals`, { method: "POST", json: { startDate: start, endDate: end, quantity: qty, deliveryAddress: address || null, note: note || null } });
      setDone(true);
    } catch (err) {
      if ((err as ApiError).status === 401) router.push(`/dang-nhap?next=/thue/moi?listing=${listingId}`);
      else setError(errorText(err));
    }
  }

  if (done) return <Alert kind="ok">Đã gửi yêu cầu thuê. Chủ cây sẽ xác nhận lịch, bạn nhận thông báo khi có phản hồi.</Alert>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl tracking-tight text-emerald-800">Đặt lịch thuê cây</h1>
      {listing && <Section title={listing.card.title}><p className="text-stone-600">{priceLabel(listing.card)} · Cọc {vnd(listing.card.rent?.deposit)} · Có {listing.quantity} {listing.card.unit}</p></Section>}
      {cal && cal.busyDays.length > 0 && (
        <Section title="Ngày đã kín lịch">
          <div className="flex flex-wrap gap-1.5 text-sm">
            {cal.busyDays.map((d) => (
              <span key={d.date} className={`rounded px-2 py-0.5 ${d.available === 0 ? "bg-red-50 text-red-800" : "bg-wood-100 text-wood-800"}`}>
                {new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}{d.available > 0 && ` (còn ${d.available})`}
              </span>
            ))}
          </div>
        </Section>
      )}
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <Label text="Từ ngày" required><input type="date" required value={start} onChange={(e) => setStart(e.target.value)} className={field} /></Label>
        <Label text="Đến ngày" required><input type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} className={field} /></Label>
        <Label text="Số lượng"><input type="number" min={1} max={listing?.quantity ?? 1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className={field} /></Label>
        <Label text="Địa chỉ nhận cây"><input value={address} onChange={(e) => setAddress(e.target.value)} className={field} /></Label>
        <div className="sm:col-span-2"><Label text="Ghi chú"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={field} placeholder="Vd: trưng bày sự kiện, cần giao trước 8h" /></Label></div>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <button className={`${btn.primary} sm:col-span-2`}>Gửi yêu cầu thuê</button>
      </form>
    </div>
  );
}
