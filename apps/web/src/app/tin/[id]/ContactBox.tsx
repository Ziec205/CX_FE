"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import type { ListingCard } from "@/lib/types";

const REPORT_REASONS: [string, string][] = [
  ["Scam", "Lừa đảo"], ["AlreadySold", "Hàng đã bán"], ["WrongPrice", "Sai giá"], ["FakePhoto", "Ảnh không thật"],
  ["Prohibited", "Hàng cấm"], ["Duplicate", "Trùng lặp"], ["WrongCategory", "Sai danh mục"], ["Unreachable", "Không liên lạc được"], ["Other", "Khác"],
];

export function ContactBox({ listing, isOwner: ownerFromServer }: { listing: ListingCard; isOwner: boolean }) {
  const router = useRouter();
  // Trang được render phía server không kèm token (để cache/SEO), nên xác định chủ tin ở trình duyệt.
  const [isOwner, setIsOwner] = useState(ownerFromServer);
  useEffect(() => {
    let cancelled = false;
    api<{ id: string }>("me").then((m) => { if (!cancelled && m.id === listing.seller.id) setIsOwner(true); }, () => {});
    return () => { cancelled = true; };
  }, [listing.seller.id]);
  const [phone, setPhone] = useState<string>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [saved, setSaved] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("Scam");
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState(false);

  function handle(e: unknown) {
    if ((e as ApiError).status === 401) router.push(`/dang-nhap?next=/tin/${listing.id}`);
    else setMsg({ kind: "err", text: errorText(e) });
  }

  async function showPhone() {
    try { setPhone((await api<{ phone: string }>(`listings/${listing.id}/phone`)).phone); } catch (e) { handle(e); }
  }
  async function chat() {
    if (opening) return;
    setOpening(true);
    try {
      const c = await api<{ id: string }>("conversations", { method: "POST", json: { listingId: listing.id } });
      router.push(`/tin-nhan?c=${c.id}`);
    } catch (e) { handle(e); setOpening(false); }
  }
  async function save() {
    try { await api(`me/favorites/${listing.id}`, { method: "PUT" }); setSaved(true); } catch (e) { handle(e); }
  }
  async function report() {
    try {
      await api(`listings/${listing.id}/reports`, { method: "POST", json: { reason, note } });
      setReporting(false);
      setMsg({ kind: "ok", text: "Cảm ơn bạn, đội kiểm duyệt sẽ xem xét." });
    } catch (e) { handle(e); }
  }

  const s = listing.seller;
  return (
    <div className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-stone-200">
      <div>
        <p className="font-semibold">{s.displayName}</p>
        <div className="mt-1 flex flex-wrap gap-1 text-xs">
          {s.isGarden ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">Nhà vườn/Shop đã xác minh</span>
            : s.isProSeller ? <span className="rounded bg-stone-100 px-2 py-0.5">Bán chuyên</span>
            : <span className="rounded bg-stone-100 px-2 py-0.5">Cá nhân</span>}
        </div>
        <Link href={`/nguoi-ban/${s.id}`} className="text-xs text-emerald-700 hover:underline">Xem trang người bán, đánh giá &amp; tin khác</Link>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {isOwner ? (
        <>
          <Link href={`/dang-tin?id=${listing.id}`} className={`${btn.primary} block text-center`}>Sửa tin</Link>
          <Link href="/tai-khoan" className={`${btn.secondary} block text-center`}>Quản lý tin</Link>
          {listing.type === "Buy" && <Link href={`/tin/${listing.id}/bao-gia`} className={`${btn.secondary} block text-center`}>Xem báo giá nhận được</Link>}
        </>
      ) : (
        <>
          {listing.escrow && listing.type === "Sell" && listing.priceMode !== "Negotiable" && listing.available > 0 && (
            <Link href={`/don-hang/moi?listing=${listing.id}`} className={`${btn.primary} block text-center`}>Mua đảm bảo</Link>
          )}
          {listing.type === "Rent" && <Link href={`/thue/moi?listing=${listing.id}`} className={`${btn.primary} block text-center`}>Đặt lịch thuê</Link>}
          {listing.type === "Buy" && <Link href={`/tin/${listing.id}/bao-gia`} className={`${btn.primary} block text-center`}>Gửi báo giá</Link>}
          <button onClick={chat} disabled={opening} className={`${listing.escrow || listing.type === "Rent" || listing.type === "Buy" ? btn.secondary : btn.primary} w-full`}>{opening ? "Đang mở cuộc trò chuyện…" : "Nhắn tin cho người bán"}</button>
          {phone ? (
            <a href={`tel:${phone}`} className={`${btn.secondary} block text-center text-base font-semibold`}>Gọi {phone}</a>
          ) : (
            <button onClick={showPhone} className={`${btn.secondary} w-full`}>Hiện số điện thoại</button>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={saved} className={`${btn.small} flex-1`}>{saved ? "Đã lưu" : "Lưu tin"}</button>
            <button onClick={() => setReporting(!reporting)} className={`${btn.small} flex-1`}>Báo cáo</button>
          </div>
          {reporting && (
            <div className="space-y-2">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
                {REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Mô tả thêm (tùy chọn)" className={field} />
              <button onClick={report} className={`${btn.danger} w-full`}>Gửi báo cáo</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
