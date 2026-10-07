"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { MoneyInput } from "@/components/MoneyInput";
import { Alert, Label, Section, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { vnd } from "@/lib/format";
import type { ListingDetail } from "@/lib/types";

interface QuoteRow {
  quote: { id: string; sellerId: string; unitPrice: number; quantity: number; note?: string | null; status: string; availableFrom?: string | null; updatedAt: string };
  seller?: { id: string; displayName: string; flags: { hasVerifiedGarden: boolean } };
  photos: string[];
}

const QUOTE_STATUS: Record<string, string> = { Sent: "Đang chờ", Selected: "Đã chọn", Declined: "Không chọn", Withdrawn: "Đã rút" };

export default function QuotesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail>();
  const [me, setMe] = useState<string>();
  const [rows, setRows] = useState<QuoteRow[]>();
  const [error, setError] = useState<string>();
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const load = useCallback(() => {
    api<QuoteRow[]>(`listings/${id}/quotes`).then(setRows, (e) => {
      if ((e as ApiError).status === 401) router.push(`/dang-nhap?next=/tin/${id}/bao-gia`);
      else setError(errorText(e));
    });
  }, [id, router]);
  useEffect(() => {
    load();
    api<ListingDetail>(`listings/${id}`).then(setListing, () => {});
    api<{ id: string }>("me").then((m) => setMe(m.id), () => {});
  }, [id, load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await api(`listings/${id}/quotes`, { method: "POST", json: { unitPrice: price, quantity: qty, note: note || null, mediaIds: photos.map((p) => p.id) } });
      load();
    } catch (err) { setError(errorText(err)); }
  }
  async function act(qid: string, action: "select" | "decline") {
    try { await api(`quotes/${qid}/${action}`, { method: "POST" }); load(); } catch (err) { setError(errorText(err)); }
  }

  const isOwner = !!listing && listing.card.seller.id === me;
  const mine = rows?.find((r) => r.quote.sellerId === me);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/tin/${id}`} className="text-sm text-emerald-700 hover:underline">← {listing?.card.title ?? "Tin cần mua"}</Link>
      <h1 className="text-4xl font-extrabold text-emerald-900">{isOwner ? "Báo giá nhận được" : "Gửi báo giá"}</h1>
      {error && <Alert>{error}</Alert>}

      {!isOwner && listing && (
        <Section title={mine ? "Cập nhật báo giá của bạn" : "Báo giá của bạn"}>
          <form onSubmit={send} className="grid gap-3 sm:grid-cols-2">
            <Label text="Đơn giá (đ)" required><MoneyInput required value={price ? String(price) : ""} onChange={(d) => setPrice(Number(d) || 0)} /></Label>
            <Label text="Số lượng" required><input type="number" min={1} required value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className={field} /></Label>
            <div className="sm:col-span-2"><Label text="Ghi chú"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={field} placeholder="Kích thước, tình trạng, thời gian có hàng…" /></Label></div>
            <div className="sm:col-span-2"><PhotoPicker value={photos} onChange={setPhotos} max={6} /></div>
            <button className={`${btn.primary} sm:col-span-2`}>{mine ? "Cập nhật" : "Gửi báo giá"}</button>
          </form>
        </Section>
      )}

      {rows?.length === 0 && <p className="text-stone-500">{isOwner ? "Chưa có báo giá nào." : ""}</p>}
      <ul className="space-y-3">
        {rows?.map((r) => (
          <li key={r.quote.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{r.seller?.displayName}{r.seller?.flags.hasVerifiedGarden && <span className="ml-1 text-xs text-emerald-700">✓ Nhà vườn</span>}</span>
              <span className="text-lg font-bold text-emerald-800">{vnd(r.quote.unitPrice)} × {r.quote.quantity}</span>
            </div>
            {r.quote.note && <p className="mt-1 text-stone-700">{r.quote.note}</p>}
            {r.photos.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.photos.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-stone-100 px-2 py-0.5">{QUOTE_STATUS[r.quote.status] ?? r.quote.status}</span>
              {isOwner && r.quote.status === "Sent" && <>
                <button onClick={() => act(r.quote.id, "select")} className={btn.small}>Chọn báo giá này</button>
                <button onClick={() => act(r.quote.id, "decline")} className="text-stone-500 hover:underline">Không chọn</button>
              </>}
              {isOwner && r.quote.status === "Selected" && r.seller?.flags.hasVerifiedGarden && (
                <Link href={`/don-hang/moi?quote=${r.quote.id}`} className={btn.small}>🛡 Tạo đơn đảm bảo</Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
