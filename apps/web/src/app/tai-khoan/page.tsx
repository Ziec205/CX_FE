"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ProfileGate } from "@/components/ProfileGate";
import { Alert, btn, field, Section } from "@/components/ui";
import { api, errorText, newIdempotencyKey } from "@/lib/api";
import { priceLabel } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import type { ListingCard, Me, PublicPricing } from "@/lib/types";

interface MyListing { card: ListingCard; rejectReason?: string | null; hasPendingRevision: boolean; expiresAt?: string | null }
interface Quote { finalPrice: number; priceBookVersion: number; factor: number }

const STATUS: Record<string, [string, string]> = {
  Active: ["Đang hiển thị", "bg-emerald-100 text-emerald-800"], PendingReview: ["Chờ duyệt", "bg-wood-200 text-wood-800"],
  Rejected: ["Bị từ chối", "bg-red-100 text-red-700"], Hidden: ["Đã ẩn", "bg-stone-200"], SoldOut: ["Đã bán", "bg-stone-200"],
  Expired: ["Hết hạn", "bg-stone-200"], TempHidden: ["Tạm ẩn chờ xử lý", "bg-orange-100 text-orange-800"], Removed: ["Bị gỡ", "bg-red-100 text-red-700"],
  Draft: ["Nháp", "bg-stone-100"],
};
const POSTED: Record<string, string> = {
  PendingReview: "Tin đã được gửi và đang chờ duyệt (thường dưới 2 giờ trong khung 7h–22h).",
  Rejected: "Tin chưa được duyệt — xem lý do bên dưới.",
};

function AccountInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const posted = sp.get("posted");
  const next = sp.get("next");
  const [me, setMe] = useState<Me>();
  const [items, setItems] = useState<MyListing[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [promo, setPromo] = useState<ListingCard>();

  const load = useCallback(() => Promise.all([api<Me>("me"), api<MyListing[]>(`me/listings${filter ? `?status=${filter}` : ""}`)]), [filter]);
  const refresh = () => load().then(([m, l]) => { setMe(m); setItems(l); }, (e) => setMsg({ kind: "err", text: errorText(e) }));

  useEffect(() => {
    let cancelled = false;
    load().then(([m, l]) => { if (!cancelled) { setMe(m); setItems(l); } }, (e) => { if (!cancelled) setMsg({ kind: "err", text: errorText(e) }); });
    return () => { cancelled = true; };
  }, [load]);

  async function act(id: string, action: string, body?: unknown) {
    try {
      if (action === "delete") { if (!confirm("Xóa tin này?")) return; await api(`listings/${id}`, { method: "DELETE" }); }
      else await api(`listings/${id}/${action}`, { method: "POST", json: body ?? {} });
      setMsg({ kind: "ok", text: "Đã cập nhật" });
      await refresh();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  if (!me) return msg ? <Alert>{msg.text}</Alert> : <p className="text-stone-500">Đang tải…</p>;
  // Khai hồ sơ xong thì quay lại trang người dùng định vào (vd /dang-tin), chỉ chấp nhận đường dẫn nội bộ.
  const afterProfile = (m: Me) => { setMe(m); if (next?.startsWith("/") && !next.startsWith("//")) router.replace(next); };
  if (!me.canPost) return <div className="mx-auto max-w-lg"><ProfileGate me={me} onDone={afterProfile} /></div>;

  return (
    <div className="space-y-4">
      {posted && POSTED[posted] && <Alert kind="info">{POSTED[posted]}</Alert>}
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Section title="Tài khoản" action={<Link href="/vi" className="text-sm text-emerald-700 hover:underline">Ví Xu →</Link>}>
        <ProfileForm me={me} onSaved={setMe} />
      </Section>

      <Section title="Tin của tôi" action={<Link href="/dang-tin" className={btn.primary}>+ Đăng tin</Link>}>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {[["", "Tất cả"], ["Active", "Đang hiển thị"], ["PendingReview", "Chờ duyệt"], ["Rejected", "Bị từ chối"], ["Hidden", "Đã ẩn"], ["Expired", "Hết hạn"], ["SoldOut", "Đã bán"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1 ${filter === v ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>{l}</button>
          ))}
        </div>
        {items.length === 0 && <p className="text-sm text-stone-500">Chưa có tin nào.</p>}
        <ul className="divide-y divide-stone-100">
          {items.map(({ card: l, rejectReason, hasPendingRevision, expiresAt }) => {
            const [label, cls] = STATUS[l.status] ?? [l.status, "bg-stone-100"];
            return (
              <li key={l.id} className="flex flex-wrap items-start gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.thumbUrl ? <img src={l.thumbUrl} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-emerald-300" />}
                <div className="min-w-0 flex-1">
                  <Link href={`/tin/${l.id}`} className="font-medium hover:text-emerald-700">{l.title}</Link>
                  <p className="text-sm font-bold text-emerald-800">{priceLabel(l)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded px-2 py-0.5 ${cls}`}>{label}</span>
                    {l.isPriority && <span className="rounded bg-wood-200 px-2 py-0.5 text-wood-800">Đang Ưu tiên</span>}
                    {hasPendingRevision && <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">Bản sửa chờ duyệt</span>}
                    {expiresAt && <span className="text-stone-500">Hết hạn {new Date(expiresAt).toLocaleDateString("vi-VN")}</span>}
                    <span className="text-stone-500">{provinceName(l.provinceId)}</span>
                  </div>
                  {rejectReason && <p className="mt-1 text-xs text-red-700">Lý do: {rejectReason}</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {l.status === "Active" && l.type !== "Give" && <button onClick={() => setPromo(l)} className={`${btn.small} border-emerald-500 text-emerald-700`}>Đẩy tin</button>}
                  {["Active", "Hidden", "SoldOut", "Draft", "Rejected"].includes(l.status) && !hasPendingRevision &&
                    <Link href={`/dang-tin?id=${l.id}`} className={btn.small}>Sửa</Link>}
                  {l.status === "Active" && <button onClick={() => act(l.id, "hide")} className={btn.small}>Ẩn</button>}
                  {l.status === "Hidden" && <button onClick={() => act(l.id, "unhide")} className={btn.small}>Hiện lại</button>}
                  {(l.status === "Active" || l.status === "Hidden") && <button onClick={() => act(l.id, "mark-sold")} className={btn.small}>Đã bán</button>}
                  {l.status === "SoldOut" && <button onClick={() => { const q = Number(prompt("Số lượng mới", "1")); if (q > 0) act(l.id, "restock", { quantity: q }); }} className={btn.small}>Nhập thêm</button>}
                  {l.status === "Expired" && <button onClick={() => act(l.id, "renew")} className={btn.small}>Gia hạn miễn phí</button>}
                  {(l.status === "Removed" || l.status === "Rejected") && <button onClick={() => { const r = prompt("Lý do khiếu nại"); if (r) act(l.id, "appeal", { reason: r }); }} className={btn.small}>Khiếu nại</button>}
                  <button onClick={() => act(l.id, "delete")} className={`${btn.small} text-red-700`}>Xóa</button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
      <Section title="Tiện ích">
        <div className="grid gap-2 text-[15px] sm:grid-cols-3">
          {[["/vuon-cua-toi", "Hồ sơ vườn & lịch nhắc"], ["/don-hang", "Đơn đảm bảo"], ["/thue", "Lịch thuê cây"], ["/yeu-thich", "Tin đã lưu"],
            ["/thong-bao", "Thông báo & cài đặt"], ["/ho-tro", "Trợ giúp & hỗ trợ"]].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl border border-stone-200 px-4 py-3 hover:border-emerald-600">{label}</Link>
          ))}
        </div>
      </Section>
      <DeleteAccount />
      {promo && <PromoteDialog listing={promo} onClose={() => setPromo(undefined)} onDone={() => { setPromo(undefined); setMsg({ kind: "ok", text: "Đã áp dụng dịch vụ" }); refresh(); }} />}
    </div>
  );
}

/** BR-AUTH-05: cảnh báo Xu và gói bị hủy, chặn khi còn đơn đảm bảo mở, xác nhận bằng OTP. */
function DeleteAccount() {
  const router = useRouter();
  const [check, setCheck] = useState<{ canDelete: boolean; blockers: string[]; losses: { xu: number; planDaysLeft: number } }>();
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string>();

  async function start() {
    setError(undefined);
    try { setCheck(await api("me/account/deletion-check")); } catch (e) { setError(errorText(e)); }
  }
  async function sendOtp() {
    try {
      const r = await api<{ devCode?: string }>("me/account/deletion-otp", { method: "POST" });
      setOtpSent(true);
      if (r.devCode) setCode(r.devCode);
    } catch (e) { setError(errorText(e)); }
  }
  async function confirmDelete() {
    try {
      await api("me/account/delete", { method: "POST", json: { otpCode: code, acknowledgeLosses: ack } });
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch (e) { setError(errorText(e)); }
  }

  return (
    <Section title="Xóa tài khoản">
      {!check ? (
        <button onClick={start} className={btn.danger}>Tôi muốn xóa tài khoản</button>
      ) : (
        <div className="space-y-3 text-[15px]">
          {check.blockers.map((b) => <Alert key={b}>{b}</Alert>)}
          {check.canDelete && <>
            <Alert kind="warn">
              Toàn bộ tin đăng sẽ bị gỡ, hồ sơ được ẩn danh. <b>{check.losses.xu} Xu</b> còn lại
              {check.losses.planDaysLeft > 0 && <> và <b>{check.losses.planDaysLeft} ngày Gói Nhà vườn</b></>} sẽ bị hủy, không hoàn lại.
              Dữ liệu giao dịch được giữ theo thời hạn luật định.
            </Alert>
            <label className="flex items-center gap-2"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-red-700" />Tôi đã hiểu và đồng ý</label>
            {!otpSent ? (
              <button onClick={sendOtp} disabled={!ack} className={btn.danger}>Gửi mã OTP xác nhận</button>
            ) : (
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Mã OTP" className={field} />
                <button onClick={confirmDelete} disabled={!ack || code.length < 4} className={btn.danger}>Xóa vĩnh viễn</button>
              </div>
            )}
          </>}
          {error && <Alert>{error}</Alert>}
        </div>
      )}
    </Section>
  );
}

function ProfileForm({ me, onSaved }: { me: Me; onSaved: (m: Me) => void }) {
  const [displayName, setDisplayName] = useState(me.displayName);
  const [hidePhone, setHidePhone] = useState(me.hidePhone);
  const [msg, setMsg] = useState<string>();
  async function save() {
    try { onSaved(await api<Me>("me", { method: "PUT", json: { displayName, hidePhone } })); setMsg("Đã lưu"); }
    catch (e) { setMsg(errorText(e)); }
  }
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <p className="text-stone-500">Số điện thoại</p><p className="font-medium">{me.phone}</p>
        <p className="mt-2 text-stone-500">Họ tên</p><p>{me.fullName}</p>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {me.flags.hasActivePlan && <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Nhà vườn/Shop</span>}
          {me.flags.isProSeller && <span className="rounded bg-stone-100 px-2 py-0.5">Bán chuyên</span>}
          {!me.flags.hasVerifiedGarden && <Link href="/nha-vuon" className="text-emerald-700 underline">Đăng ký Nhà vườn/Shop</Link>}
        </div>
      </div>
      <div className="space-y-2">
        <label className="block">Tên hiển thị<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={`${field} mt-1`} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={hidePhone} onChange={(e) => setHidePhone(e.target.checked)} />Ẩn số điện thoại (chỉ nhận liên hệ qua chat)</label>
        <button onClick={save} className={btn.secondary}>Lưu</button>{msg && <span className="ml-2 text-xs text-stone-500">{msg}</span>}
      </div>
    </div>
  );
}

function PromoteDialog({ listing, onClose, onDone }: { listing: ListingCard; onClose: () => void; onDone: () => void }) {
  const [pricing, setPricing] = useState<PublicPricing>();
  const [balance, setBalance] = useState<number>();
  const [choice, setChoice] = useState<{ code: string; days?: number | null }>();
  const [quote, setQuote] = useState<Quote>();
  const [error, setError] = useState<string>();
  const [key] = useState(newIdempotencyKey);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<PublicPricing>("pricing/current"), api<{ balance: number }>("wallet")])
      .then(([p, w]) => { if (!cancelled) { setPricing(p); setBalance(w.balance); } }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!choice) return;
    let cancelled = false;
    api<Quote>(`pricing/quote?service=${choice.code}${choice.days ? `&days=${choice.days}` : ""}&categoryId=${listing.categoryId}`)
      .then((q) => { if (!cancelled) setQuote(q); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [choice, listing.categoryId]);

  async function buy() {
    if (!choice || !quote) return;
    try {
      await api(`listings/${listing.id}/promotions`, { method: "POST", json: {
        service: choice.code, days: choice.days ?? null, expectedPriceBookVersion: quote.priceBookVersion, expectedPrice: quote.finalPrice, idempotencyKey: key,
      } });
      onDone();
    } catch (e) { setError(errorText(e)); }
  }

  const NAMES: Record<string, string> = { BUMP: "Đẩy tin lên đầu", AUTO_BUMP: "Đẩy tự động", PRIORITY: "Tin Ưu tiên", LABEL: "Nhãn nổi bật" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Tăng hiển thị cho tin</h3>
        <p className="line-clamp-1 text-sm text-stone-500">{listing.title}</p>
        <p className="text-sm">Số dư: <b>{balance ?? "…"} Xu</b> · <Link href="/vi" className="text-emerald-700 underline">Nạp Xu</Link></p>
        <div className="space-y-2">
          {pricing?.listingServices.filter((s) => s.enabled).map((s) => {
            const selected = choice?.code === s.code && (choice.days ?? null) === (s.days ?? null);
            return (
              <button key={`${s.code}-${s.days}-${s.labelName}`} onClick={() => { setQuote(undefined); setChoice({ code: s.code, days: s.days }); }}
                className={`w-full rounded-lg border p-3 text-left text-sm ${selected ? "border-emerald-600 bg-emerald-50" : "border-stone-200"}`}>
                <b>{NAMES[s.code] ?? s.code}</b>{s.days ? ` ${s.days} ngày` : ""}{s.code === "AUTO_BUMP" && ` (${s.perDay} lần/ngày)`}{s.labelName && ` “${s.labelName}”`}
                {selected && quote && <span className="float-right font-semibold text-emerald-700">{quote.finalPrice} Xu{quote.factor > 1 && ` (×${quote.factor} mùa vụ)`}</span>}
              </button>
            );
          })}
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="flex gap-2">
          <button onClick={onClose} className={`${btn.secondary} flex-1`}>Đóng</button>
          <button onClick={buy} disabled={!quote} className={`${btn.primary} flex-1`}>{quote ? `Thanh toán ${quote.finalPrice} Xu` : "Chọn dịch vụ"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return <Suspense><AccountInner /></Suspense>;
}
