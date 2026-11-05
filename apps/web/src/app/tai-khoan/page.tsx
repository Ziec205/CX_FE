"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ProfileGate } from "@/components/ProfileGate";
import { Alert, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { priceLabel } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import type { ListingCard, Me } from "@/lib/types";

interface MyListing { card: ListingCard; rejectReason?: string | null; hasPendingRevision: boolean; expiresAt?: string | null }

const STATUS: Record<string, [string, string]> = {
  Active: ["Đang hiển thị", "bg-emerald-100 text-emerald-800"], PendingReview: ["Chờ duyệt", "bg-wood-200 text-wood-800"],
  Rejected: ["Bị từ chối", "bg-red-100 text-red-700"], Hidden: ["Đã ẩn", "bg-stone-200 text-stone-700"], SoldOut: ["Đã bán", "bg-stone-200 text-stone-700"],
  Expired: ["Hết hạn", "bg-stone-200 text-stone-700"], TempHidden: ["Tạm ẩn chờ xử lý", "bg-orange-100 text-orange-800"], Removed: ["Bị gỡ", "bg-red-100 text-red-700"],
  Draft: ["Nháp", "bg-stone-100 text-stone-700"],
};
const FILTERS: [string, string][] = [["", "Tất cả"], ["Active", "Đang hiển thị"], ["PendingReview", "Chờ duyệt"], ["Rejected", "Bị từ chối"], ["Hidden", "Đã ẩn"], ["Expired", "Hết hạn"], ["SoldOut", "Đã bán"]];
const POSTED: Record<string, string> = {
  PendingReview: "Đã gửi tin. Tin đang chờ duyệt, thường dưới 2 giờ trong khung 7h–22h.",
  Rejected: "Tin chưa được duyệt. Xem lý do ở tin bên dưới, sửa lại rồi gửi lại.",
};
const LINKS: [string, string, string][] = [
  ["/vuon-cua-toi", "Hồ sơ vườn", "Cây đang trồng và lịch nhắc"], ["/tin-nhan", "Tin nhắn", "Trò chuyện với người mua, người bán"],
  ["/thue", "Lịch thuê cây", "Cây đang thuê, cho thuê"],
  ["/yeu-thich", "Tin đã lưu", "Cây bạn đang để ý"], ["/vi", "Ví Xu Xanh", "Nạp Xu, lịch sử dùng Xu"],
  ["/thong-bao", "Thông báo", "Thông báo và cài đặt nhận tin"], ["/ho-tro", "Trợ giúp", "Câu hỏi thường gặp, liên hệ"],
];

function AccountInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const posted = sp.get("posted");
  const next = sp.get("next");
  const [me, setMe] = useState<Me>();
  const [items, setItems] = useState<MyListing[]>();
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => Promise.all([api<Me>("me"), api<MyListing[]>(`me/listings${filter ? `?status=${filter}` : ""}`)]), [filter]);
  const refresh = () => load().then(([m, l]) => { setMe(m); setItems(l); }, (e) => setMsg({ kind: "err", text: errorText(e) }));

  useEffect(() => {
    let cancelled = false;
    load().then(([m, l]) => { if (!cancelled) { setMe(m); setItems(l); } }, (e) => { if (!cancelled) setMsg({ kind: "err", text: errorText(e) }); });
    return () => { cancelled = true; };
  }, [load]);

  // Thông báo thành công tự tắt; lỗi giữ lại đến khi người dùng đóng.
  useEffect(() => {
    if (msg?.kind !== "ok") return;
    const t = setTimeout(() => setMsg(undefined), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function act(id: string, action: string, body?: unknown, done = "Đã cập nhật tin") {
    try {
      if (action === "delete") await api(`listings/${id}`, { method: "DELETE" });
      else await api(`listings/${id}/${action}`, { method: "POST", json: body ?? {} });
      setMsg({ kind: "ok", text: done });
      await refresh();
      return true;
    } catch (e) {
      // Hết lượt đăng miễn phí: để nơi gọi hỏi người dùng có trả Xu không.
      if ((e as ApiError).code === "LISTING_FEE_REQUIRED") throw e;
      setMsg({ kind: "err", text: errorText(e) }); return false;
    }
  }

  if (!me) return msg ? <Alert>{msg.text}</Alert> : (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"><div className="cx-shimmer h-72 rounded-3xl" /><div className="cx-shimmer h-96 rounded-3xl" /></div>
  );
  // Khai hồ sơ xong thì quay lại trang người dùng định vào (vd /dang-tin), chỉ chấp nhận đường dẫn nội bộ.
  const afterProfile = (m: Me) => { setMe(m); if (next?.startsWith("/") && !next.startsWith("//")) router.replace(next); };

  return (
    <div className="space-y-6">
      {posted && POSTED[posted] && <Alert kind="info">{POSTED[posted]}</Alert>}
      {msg && (
        <div role="status" className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(undefined)} className="text-sm font-semibold underline">Đóng</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        <aside className="space-y-6 lg:sticky lg:top-36 lg:self-start">
          <ProfileCard me={me} onSaved={setMe} />
          <nav aria-label="Tiện ích tài khoản" className="cx-card p-2">
            <ul>
              {LINKS.map(([href, label, sub]) => (
                <li key={href}>
                  <Link href={href} className="flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 hover:bg-stone-50">
                    <span><span className="block font-semibold">{label}</span><span className="block text-sm text-stone-500">{sub}</span></span>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {!me.canPost && (
            <div className="rounded-3xl bg-wood-100 p-5 ring-1 ring-wood-200 sm:p-6">
              <h2 className="mb-1 cx-h2">Hoàn tất thông tin để đăng tin</h2>
              <p className="mb-4 text-stone-700">Chỉ cần họ tên và tỉnh/thành, không cần CCCD.</p>
              <ProfileGate me={me} onDone={afterProfile} />
            </div>
          )}

          <section aria-labelledby="my-listings" className="cx-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 id="my-listings" className="text-3xl font-extrabold text-emerald-900">Tin của tôi</h1>
              {me.canPost && <Link href="/dang-tin" className={btn.primary}>Đăng tin mới</Link>}
            </div>
            <div role="tablist" aria-label="Lọc theo trạng thái" className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {FILTERS.map(([v, l]) => (
                <button key={v} role="tab" aria-selected={filter === v} onClick={() => setFilter(v)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${filter === v ? "bg-emerald-800 text-white ring-emerald-800" : "bg-white text-stone-700 ring-stone-300 hover:ring-emerald-700"}`}>{l}</button>
              ))}
            </div>

            {items === undefined && [0, 1].map((i) => <div key={i} className="cx-shimmer mb-3 h-28 rounded-2xl" />)}
            {items?.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center">
                <p className="text-stone-600">{filter ? "Không có tin nào ở trạng thái này." : "Bạn chưa đăng tin nào."}</p>
                {!filter && me.canPost && <Link href="/dang-tin" className={`${btn.primary} mt-3`}>Đăng tin đầu tiên</Link>}
              </div>
            )}
            <ul className="divide-y divide-stone-200">
              {items?.map((it) => <ListingRow key={it.card.id} item={it} act={act} />)}
            </ul>
          </section>

          <DeleteAccount hasPhone={!!me.phone} />
        </div>
      </div>

    </div>
  );
}

type Act = (id: string, action: string, body?: unknown, done?: string) => Promise<boolean>;

/** Một tin: thông tin bên trái, thao tác bên phải. Các thao tác cần nhập thêm (nhập hàng, khiếu nại, xóa) mở ngay dưới tin. */
function ListingRow({ item, act }: { item: MyListing; act: Act }) {
  const { card: l, rejectReason, hasPendingRevision, expiresAt } = item;
  const [label, cls] = STATUS[l.status] ?? [l.status, "bg-stone-100"];
  const [panel, setPanel] = useState<"restock" | "appeal" | "delete">();
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action: string, body?: unknown, done?: string) => { setBusy(true); if (await act(l.id, action, body, done)) setPanel(undefined); setBusy(false); };
  /** Đăng lại tính như một tin mới: hết lượt miễn phí thì hỏi trước khi trừ Xu. */
  const renew = async () => {
    try { await run("renew", undefined, "Đã đăng lại tin"); }
    catch (e) {
      const xu = ((e as ApiError).details as { xu: number }).xu;
      if (confirm(`Bạn đã hết lượt đăng miễn phí tháng này. Trả ${xu} Xu để đăng lại tin?`)) await run("renew", { acceptFeeXu: xu }, "Đã đăng lại tin").catch(() => {});
      setBusy(false);
    }
  };
  const toggle = (p: typeof panel) => setPanel(panel === p ? undefined : p);

  return (
    <li className="py-4">
      <div className="flex gap-4">
        <Link href={`/tin/${l.id}`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.thumbUrl ? <img src={l.thumbUrl} alt="" className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28" /> : <div className="h-24 w-24 rounded-2xl bg-emerald-100 sm:h-28 sm:w-28" />}
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className={`rounded-full px-2.5 py-0.5 ${cls}`}>{label}</span>
            {hasPendingRevision && <span className="rounded-full bg-water-50 px-2.5 py-0.5 text-water-700">Bản sửa chờ duyệt</span>}
          </div>
          <Link href={`/tin/${l.id}`} className="line-clamp-2 font-semibold leading-snug hover:text-emerald-700">{l.title}</Link>
          <p className="font-display text-lg font-bold text-stone-900">{priceLabel(l)}</p>
          <p className="text-sm text-stone-500">{provinceName(l.provinceId)}{expiresAt && `, hết hạn ${new Date(expiresAt).toLocaleDateString("vi-VN")}`}</p>
          {rejectReason && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"><b>Lý do:</b> {rejectReason}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:pl-32">
        {l.status === "Active" && l.type === "Sell" && <Link href={`/tin/${l.id}#so-cho`} className={btn.small}>So với chợ (AI)</Link>}
        {l.status === "Expired" && <button disabled={busy} onClick={renew} className="rounded-full bg-wood-400 px-3.5 py-1.5 text-sm font-semibold text-stone-900">Đăng lại (dùng 1 lượt)</button>}
        {["Active", "Hidden", "SoldOut", "Draft", "Rejected"].includes(l.status) && !hasPendingRevision && <Link href={`/dang-tin?id=${l.id}`} className={btn.small}>Sửa</Link>}
        {l.status === "Active" && <button disabled={busy} onClick={() => run("hide", undefined, "Đã ẩn tin")} className={btn.small}>Ẩn</button>}
        {l.status === "Hidden" && <button disabled={busy} onClick={() => run("unhide", undefined, "Tin đã hiện lại")} className={btn.small}>Hiện lại</button>}
        {(l.status === "Active" || l.status === "Hidden") && <button disabled={busy} onClick={() => run("mark-sold", undefined, "Đã đánh dấu bán hết")} className={btn.small}>Đã bán hết</button>}
        {l.status === "SoldOut" && <button onClick={() => toggle("restock")} aria-expanded={panel === "restock"} className={btn.small}>Nhập thêm hàng</button>}
        {(l.status === "Removed" || l.status === "Rejected") && <button onClick={() => toggle("appeal")} aria-expanded={panel === "appeal"} className={btn.small}>Khiếu nại</button>}
        <button onClick={() => toggle("delete")} aria-expanded={panel === "delete"} className={`${btn.small} text-red-700`}>Xóa</button>
      </div>

      {panel === "restock" && (
        <form onSubmit={(e) => { e.preventDefault(); const q = Number(qty); if (q > 0) run("restock", { quantity: q }, "Đã nhập thêm hàng, tin hiển thị lại"); }}
          className="mt-3 flex flex-wrap items-center gap-2 cx-soft sm:ml-32">
          <label htmlFor={`q-${l.id}`} className="text-sm font-semibold">Số lượng mới</label>
          <input id={`q-${l.id}`} type="number" min={1} autoFocus value={qty} onChange={(e) => setQty(e.target.value)} className={`${field} w-28`} />
          <button disabled={busy || !(Number(qty) > 0)} className={btn.primary}>Lưu</button>
          <button type="button" onClick={() => setPanel(undefined)} className="text-sm text-stone-600 underline">Hủy</button>
        </form>
      )}
      {panel === "appeal" && (
        <form onSubmit={(e) => { e.preventDefault(); if (reason.trim()) run("appeal", { reason: reason.trim() }, "Đã gửi khiếu nại, đội kiểm duyệt sẽ xem lại"); }}
          className="mt-3 space-y-2 cx-soft sm:ml-32">
          <label htmlFor={`a-${l.id}`} className="block text-sm font-semibold">Vì sao tin này nên được duyệt lại?</label>
          <textarea id={`a-${l.id}`} rows={3} autoFocus maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className={field}
            placeholder="Vd: cây này không thuộc danh mục hàng cấm, tôi có giấy tờ nguồn gốc…" />
          <div className="flex gap-2">
            <button disabled={busy || !reason.trim()} className={btn.primary}>Gửi khiếu nại</button>
            <button type="button" onClick={() => setPanel(undefined)} className={btn.secondary}>Hủy</button>
          </div>
        </form>
      )}
      {panel === "delete" && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 p-3 sm:ml-32">
          <span className="text-sm text-red-900">Xóa hẳn tin này? Không khôi phục được. Nếu chỉ muốn tạm dừng, hãy bấm Ẩn.</span>
          <button disabled={busy} onClick={() => run("delete", undefined, "Đã xóa tin")} className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-800">Xóa tin</button>
          <button onClick={() => setPanel(undefined)} className="text-sm text-stone-700 underline">Giữ lại</button>
        </div>
      )}
    </li>
  );
}

function ProfileCard({ me, onSaved }: { me: Me; onSaved: (m: Me) => void }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [hidePhone, setHidePhone] = useState(me.hidePhone);
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(undefined);
    try { onSaved(await api<Me>("me", { method: "PUT", json: { displayName: displayName.trim(), hidePhone } })); setEditing(false); }
    catch (err) { setMsg(errorText(err)); } finally { setBusy(false); }
  }

  const initial = me.displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <section aria-label="Hồ sơ" className="rounded-3xl bg-emerald-900 p-6 text-white">
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-wood-400 font-display text-3xl font-extrabold text-stone-900">{initial}</span>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-bold">{me.displayName}</p>
          {me.username && <p className="truncate text-sm text-emerald-200">@{me.username}</p>}
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        {me.fullName && <div><dt className="text-emerald-300">Họ tên (không công khai)</dt><dd className="font-medium">{me.fullName}</dd></div>}
        {me.provinceId && <div><dt className="text-emerald-300">Khu vực</dt><dd className="font-medium">{provinceName(me.provinceId)}</dd></div>}
        <div>
          <dt className="text-emerald-300">Số điện thoại</dt>
          <dd>{me.phone ? <span className="font-medium">{me.phone}{me.hidePhone && <span className="text-emerald-300">, đang ẩn với người mua</span>}</span> : <AttachPhone onSaved={onSaved} />}</dd>
        </div>
      </dl>

      {editing ? (
        <form onSubmit={save} className="mt-5 space-y-3 rounded-2xl bg-white p-4 text-stone-900">
          <label className="block text-sm font-semibold">Tên hiển thị
            <input required maxLength={50} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={`${field} mt-1`} />
          </label>
          {me.phone && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={hidePhone} onChange={(e) => setHidePhone(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
              Ẩn số điện thoại, chỉ nhận liên hệ qua tin nhắn
            </label>
          )}
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <div className="flex gap-2">
            <button disabled={busy || !displayName.trim()} className={btn.primary}>{busy ? "Đang lưu…" : "Lưu"}</button>
            <button type="button" onClick={() => { setEditing(false); setDisplayName(me.displayName); setHidePhone(me.hidePhone); }} className={btn.secondary}>Hủy</button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setEditing(true)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">Sửa hồ sơ</button>
        </div>
      )}
    </section>
  );
}

/** Gắn SĐT bằng OTP. Không bắt buộc, giúp người mua gọi trực tiếp và dùng để xác nhận khi xóa tài khoản. */
function AttachPhone({ onSaved }: { onSaved: (m: Me) => void }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string>();
  async function send(e: React.FormEvent) {
    e.preventDefault(); setMsg(undefined);
    try {
      const r = await api<{ devCode?: string }>("me/phone/request", { method: "POST", json: { phone } });
      setSent(true);
      if (r.devCode) setMsg(`Môi trường phát triển, mã OTP: ${r.devCode}`);
    } catch (err) { setMsg(errorText(err)); }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    try { onSaved(await api<Me>("me/phone/verify", { method: "POST", json: { phone, code } })); }
    catch (err) { setMsg(errorText(err)); }
  }
  if (!open) return (
    <span className="block">
      <span className="text-emerald-100">Chưa có, không bắt buộc.</span>{" "}
      <button onClick={() => setOpen(true)} className="font-semibold text-wood-400 underline">Thêm số</button>
    </span>
  );
  return (
    <div className="mt-2 space-y-2 rounded-2xl bg-white p-3 text-stone-900">
      {!sent ? (
        <form onSubmit={send} className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" autoFocus aria-label="Số điện thoại" placeholder="Số điện thoại" className={field} />
          <button disabled={phone.trim().length < 9} className={`${btn.primary} shrink-0`}>Gửi mã</button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} aria-label="Mã OTP 6 số" placeholder="Mã 6 số" className={field} />
          <button disabled={code.length !== 6} className={`${btn.primary} shrink-0`}>Xác nhận</button>
        </form>
      )}
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </div>
  );
}

/** BR-AUTH-05: cảnh báo Xu và gói bị hủy, chặn khi còn đơn đảm bảo mở, xác nhận bằng OTP (hoặc mật khẩu nếu tài khoản chưa có SĐT). */
function DeleteAccount({ hasPhone }: { hasPhone: boolean }) {
  const router = useRouter();
  const [check, setCheck] = useState<{ canDelete: boolean; blockers: string[]; losses: { xu: number; planDaysLeft: number } }>();
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
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
  async function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("me/account/delete", { method: "POST", json: hasPhone ? { otpCode: code, acknowledgeLosses: ack } : { password, acknowledgeLosses: ack } });
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch (err) { setError(errorText(err)); }
  }

  return (
    <details className="group cx-card-flush">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5 sm:px-7">
        <span className="font-semibold text-stone-700">Xóa tài khoản</span>
        <span aria-hidden className="text-stone-400 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-3 px-5 pb-5 sm:px-7">
        {!check ? (
          <>
            <p className="text-sm text-stone-600">Tin đăng bị gỡ, Xu còn lại bị hủy. Trước khi xóa, Chạm Xanh kiểm tra xem bạn còn đơn đảm bảo nào đang mở không.</p>
            <button onClick={start} className={btn.danger}>Kiểm tra trước khi xóa</button>
          </>
        ) : (
          <>
            {check.blockers.map((b) => <Alert key={b}>{b}</Alert>)}
            {check.canDelete && <>
              <Alert kind="warn">
                Toàn bộ tin đăng sẽ bị gỡ, hồ sơ được ẩn danh. <b>{check.losses.xu} Xu</b> còn lại
                {check.losses.planDaysLeft > 0 && <> và <b>{check.losses.planDaysLeft} ngày gói Plus/Pro</b></>} sẽ bị hủy, không hoàn lại.
                Dữ liệu giao dịch được giữ theo thời hạn luật định.
              </Alert>
              <label className="flex items-center gap-2"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-4 w-4 accent-red-700" />Tôi đã hiểu và muốn xóa tài khoản</label>
              {!hasPhone ? (
                <form onSubmit={confirmDelete} className="flex gap-2">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-label="Mật khẩu" placeholder="Nhập mật khẩu để xác nhận" className={field} />
                  <button disabled={!ack || !password} className={`${btn.danger} shrink-0`}>Xóa vĩnh viễn</button>
                </form>
              ) : !otpSent ? (
                <button onClick={sendOtp} disabled={!ack} className={btn.danger}>Gửi mã OTP xác nhận</button>
              ) : (
                <form onSubmit={confirmDelete} className="flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" aria-label="Mã OTP" placeholder="Mã OTP" className={field} />
                  <button disabled={!ack || code.length < 4} className={`${btn.danger} shrink-0`}>Xóa vĩnh viễn</button>
                </form>
              )}
            </>}
          </>
        )}
        {error && <Alert>{error}</Alert>}
      </div>
    </details>
  );
}

export default function AccountPage() {
  return <Suspense><AccountInner /></Suspense>;
}
