"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, Label, Section, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { DELIVERY } from "@/lib/escrow";
import { vnd } from "@/lib/format";
import type { DeliveryMethod, EscrowOrder, ListingDetail } from "@/lib/types";

export default function NewOrderPage() {
  return <Suspense><NewOrder /></Suspense>;
}

function NewOrder() {
  const router = useRouter();
  const params = useSearchParams();
  const listingId = params.get("listing");
  const quoteId = params.get("quote");
  const offerId = params.get("offer");
  const [listing, setListing] = useState<ListingDetail>();
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState<DeliveryMethod>("SellerDelivery");
  const [address, setAddress] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [pickupDate, setPickupDate] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    api<ListingDetail>(`listings/${listingId}`).then((l) => { if (!cancelled) setListing(l); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [listingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    const body = {
      delivery, deliveryAddress: delivery === "BuyerPickup" ? null : address, shippingFee: delivery === "BuyerPickup" ? 0 : shippingFee,
      pickupDate: delivery === "BuyerPickup" && pickupDate ? new Date(pickupDate).toISOString() : null,
    };
    try {
      const o = quoteId
        ? await api<EscrowOrder>(`quotes/${quoteId}/order`, { method: "POST", json: body })
        : offerId
        ? await api<EscrowOrder>("escrow/orders/from-offer", { method: "POST", json: { ...body, offerMessageId: offerId, quantity: qty } })
        : await api<EscrowOrder>("escrow/orders", { method: "POST", json: { ...body, listingId, quantity: qty } });
      router.push(`/don-hang/${o.id}`);
    } catch (err) {
      if ((err as ApiError).status === 401) router.push(`/dang-nhap?next=/don-hang/moi?listing=${listingId}`);
      else setError(errorText(err));
    } finally { setBusy(false); }
  }

  const unit = listing?.card.price ?? 0;
  const items = unit * qty;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl tracking-tight text-emerald-800">{offerId ? "Tạo đơn đảm bảo từ đề nghị giá" : "Mua qua Giao dịch đảm bảo"}</h1>
      {offerId && <p className="text-stone-600">Nhập hình thức giao, địa chỉ và phí ship đã thỏa thuận với người mua. Người mua có 24 giờ để thanh toán.</p>}
      <Alert kind="info">Tiền của bạn được đối tác thanh toán giữ đến khi bạn xác nhận đã nhận cây đúng mô tả. Có vấn đề thì khiếu nại trong 48 giờ.</Alert>
      {listing && (
        <Section title={listing.card.title}>
          <p className="text-stone-600">Đơn giá {vnd(unit)} · Còn {listing.card.available} {listing.card.unit}</p>
        </Section>
      )}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        {!quoteId && (
          <Label text="Số lượng"><input type="number" min={1} max={listing?.card.available ?? 1000} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className={field} /></Label>
        )}
        <fieldset className="space-y-2">
          <legend className="mb-1.5 font-bold">Hình thức giao nhận</legend>
          {(["SellerDelivery", "BuyerPickup", "SelfArrangedCarrier"] as const).map((d) => (
            <label key={d} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${delivery === d ? "border-emerald-600 bg-emerald-50" : "border-stone-200"}`}>
              <input type="radio" name="delivery" checked={delivery === d} onChange={() => setDelivery(d)} className="mt-1 accent-emerald-700" />
              <span><b>{DELIVERY[d].label}</b><span className="block text-sm text-stone-600">{DELIVERY[d].hint}</span></span>
            </label>
          ))}
        </fieldset>
        {delivery === "BuyerPickup" ? (
          <Label text="Ngày hẹn đến lấy" required><input type="date" required value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={field} /></Label>
        ) : (
          <>
            <Label text="Địa chỉ nhận hàng" required><textarea required value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={field} /></Label>
            <Label text="Phí giao hàng đã thỏa thuận (đ)" hint="Nhập 0 nếu người bán miễn phí giao">
              <input type="number" min={0} step={1000} value={shippingFee} onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))} className={field} />
            </Label>
          </>
        )}
        {!quoteId && listing && (
          <div className="rounded-xl bg-stone-50 p-4 text-[15px]">
            <div className="flex justify-between"><span>Tiền cây</span><span>{vnd(items)}</span></div>
            <div className="flex justify-between"><span>Phí giao</span><span>{vnd(delivery === "BuyerPickup" ? 0 : shippingFee)}</span></div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-bold"><span>Tổng thanh toán</span><span>{vnd(items + (delivery === "BuyerPickup" ? 0 : shippingFee))}</span></div>
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        <button disabled={busy} className={`${btn.primary} w-full`}>{busy ? "Đang tạo đơn…" : "Tạo đơn và thanh toán"}</button>
      </form>
    </div>
  );
}
