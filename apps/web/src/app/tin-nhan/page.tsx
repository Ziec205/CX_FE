"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, errorText, uploadPhoto, type ApiError } from "@/lib/api";
import { shortVnd, timeAgo, vnd } from "@/lib/format";
import { createChatConnection } from "@/lib/realtime";

interface Conv {
  id: string; listingId: string; listing: { title: string; thumbUrl?: string; price?: number; type: string };
  last?: { preview: string; at: string }; role: "buyer" | "seller"; otherUserId: string; unread: number; blocked: boolean;
}
interface Msg {
  id: string; senderId: string; type: "Text" | "Image" | "Location" | "Offer" | "System"; text?: string; mediaIds: string[];
  lat?: number; lng?: number; offer?: { amount: number; status: string }; warning?: string; createdAt: string;
}

const POLL_MS = 30000; // Realtime qua SignalR; polling chậm chỉ để dự phòng khi mất kết nối.
const OFFER_STATUS: Record<string, string> = { Pending: "Chờ người bán trả lời", Accepted: "Người bán đã đồng ý", Rejected: "Người bán đã từ chối", Countered: "Người bán đã trả giá" };

/** Thêm hoặc thay tin nhắn theo id: realtime và phản hồi của lệnh gửi có thể về theo thứ tự bất kỳ. */
const upsert = (list: Msg[], m: Msg) => (list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m]);

const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Hôm nay";
  if (d.toDateString() === y.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function ChatInner() {
  const router = useRouter();
  const active = useSearchParams().get("c");
  const [convs, setConvs] = useState<Conv[]>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [meId, setMeId] = useState<string>();
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState<string>();
  const [opened, setOpened] = useState<Conv>();
  // Hội thoại vừa tạo chưa có tin nhắn nên chưa nằm trong danh sách: lấy riêng theo id.
  const current = convs?.find((c) => c.id === active) ?? (opened?.id === active ? opened : undefined);

  useEffect(() => {
    api<{ id: string }>("me").then((m) => setMeId(m.id), (e) => { if ((e as ApiError).status === 401) setNeedLogin(true); });
  }, []);

  // Đổi hội thoại: xóa tin nhắn và lỗi của hội thoại cũ ngay trong lúc render (không đợi effect).
  const [shown, setShown] = useState(active);
  if (shown !== active) { setShown(active); setMsgs([]); setError(undefined); }

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    api<Conv>(`conversations/${active}`).then((c) => { if (!cancelled) setOpened(c); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api<Conv[]>("conversations").then((r) => { if (!cancelled) setConvs(r); }, () => { if (!cancelled) setConvs((x) => x ?? []); });
      if (active) api<Msg[]>(`conversations/${active}/messages`).then((r) => { if (!cancelled) setMsgs(r.reverse()); }, (e) => { if (!cancelled) setError(errorText(e)); });
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    if (active) api(`conversations/${active}/read`, { method: "POST" }).catch(() => {});
    return () => { cancelled = true; clearInterval(t); };
  }, [active]);

  useEffect(() => {
    const conn = createChatConnection();
    conn.on("message", (m: Msg & { conversationId: string }) => {
      if (m.conversationId === active) {
        setMsgs((x) => upsert(x, m));
        api(`conversations/${active}/read`, { method: "POST" }).catch(() => {});
      }
      api<Conv[]>("conversations").then(setConvs, () => {});
    });
    conn.start().catch(() => {}); // lỗi kết nối: polling dự phòng vẫn chạy
    return () => { conn.stop(); };
  }, [active]);

  if (needLogin) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl bg-white p-8 text-center ring-1 ring-stone-200">
        <h1 className="text-3xl font-bold text-emerald-900">Tin nhắn</h1>
        <p className="text-stone-600">Đăng nhập để xem và trả lời tin nhắn với người mua, người bán.</p>
        <Link href="/dang-nhap?next=/tin-nhan" className="inline-block rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-700">Đăng nhập</Link>
      </div>
    );
  }

  return (
    // Điện thoại: khi mở một hội thoại thì phủ toàn màn hình như ứng dụng chat (che cả thanh tab dưới đáy).
    <div className={`grid grid-cols-[minmax(0,1fr)] overflow-hidden bg-white md:h-[calc(100dvh-13rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:rounded-3xl md:ring-1 md:ring-stone-200 ${
      active ? "fixed inset-0 z-40 md:static" : "-mx-4 min-h-[60dvh] sm:mx-0 sm:rounded-3xl sm:ring-1 sm:ring-stone-200"}`}>
      <aside className={`min-h-0 flex-col border-stone-200 md:flex md:border-r ${active ? "hidden" : "flex"}`}>
        <h1 className="border-b border-stone-200 px-5 py-4 text-2xl font-bold text-emerald-900">Tin nhắn</h1>
        <ul className="flex-1 overflow-y-auto">
          {convs === undefined && [0, 1, 2].map((i) => <li key={i} className="cx-shimmer m-3 h-16 rounded-2xl" />)}
          {convs?.length === 0 && (
            <li className="space-y-3 p-6 text-center text-stone-600">
              <p>Chưa có cuộc trò chuyện nào. Mở một tin trong chợ và bấm Nhắn tin để hỏi người bán.</p>
              <Link href="/cho-cay" className="inline-block rounded-full bg-wood-400 px-5 py-2 font-semibold text-stone-900">Vào chợ cây</Link>
            </li>
          )}
          {convs?.map((c) => (
            <li key={c.id}>
              <button onClick={() => router.push(`/tin-nhan?c=${c.id}`)} aria-current={c.id === active ? "true" : undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${c.id === active ? "bg-emerald-50" : "hover:bg-stone-50"}`}>
                <Thumb url={c.listing.thumbUrl} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate ${c.unread > 0 ? "font-bold" : "font-medium"}`}>{c.listing.title}</p>
                    <span className="shrink-0 text-xs text-stone-500">{timeAgo(c.last?.at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${c.unread > 0 ? "text-stone-900" : "text-stone-500"}`}>
                      <span className={c.role === "buyer" ? "text-emerald-700" : "text-wood-600"}>{c.role === "buyer" ? "Bạn hỏi mua" : "Khách hỏi"}: </span>
                      {c.last?.preview ?? "Chưa có tin nhắn"}
                    </p>
                    {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs font-bold text-white">{c.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`min-h-0 flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {!active && (
          <div className="m-auto max-w-xs space-y-2 p-6 text-center text-stone-500">
            <p className="font-display text-xl font-bold text-stone-700">Chọn một cuộc trò chuyện</p>
            <p className="text-sm">Hỏi thêm ảnh, trả giá, hẹn xem cây, tất cả nằm ở đây.</p>
          </div>
        )}
        {active && !current && !error && <div className="cx-shimmer m-4 h-16 rounded-2xl" />}
        {active && !current && error && <p className="m-auto p-6 text-center text-red-700">{error}</p>}
        {current && <Thread key={current.id} conv={current} meId={meId} msgs={msgs} setMsgs={setMsgs} error={error} setError={setError} onBack={() => router.push("/tin-nhan")} />}
      </section>
    </div>
  );
}

function Thread({ conv, meId, msgs, setMsgs, error, setError, onBack }: {
  conv: Conv; meId?: string; msgs: Msg[]; setMsgs: React.Dispatch<React.SetStateAction<Msg[]>>;
  error?: string; setError: (e?: string) => void; onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  async function send(body: Record<string, unknown>) {
    setSending(true); setError(undefined);
    try {
      const m = await api<Msg>(`conversations/${conv.id}/messages`, { method: "POST", json: body });
      setMsgs((x) => upsert(x, m));
      return true;
    } catch (e) { setError(errorText(e)); return false; } finally { setSending(false); }
  }

  async function sendText(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    if (await send({ type: "Text", text: t })) setText("");
  }

  async function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(offer.replace(/\D/g, ""));
    if (amount < 1000) return setError("Giá đề nghị tối thiểu 1.000 đ");
    if (await send({ type: "Offer", offerAmount: amount })) { setOffer(""); setOfferOpen(false); }
  }

  async function sendPhoto(f: File | undefined) {
    if (!f) return;
    setUploading(true); setError(undefined);
    try { const p = await uploadPhoto(f); await send({ type: "Image", mediaIds: [p.id] }); }
    catch (e) { setError(errorText(e)); } finally { setUploading(false); }
  }

  async function respond(messageId: string, accept: boolean, counter?: number) {
    setError(undefined);
    try {
      await api(`conversations/${conv.id}/offers/${messageId}/respond`, { method: "POST", json: { accept, counterAmount: counter ?? null } });
      setMsgs(await api<Msg[]>(`conversations/${conv.id}/messages`).then((r) => r.reverse()));
    } catch (e) { setError(errorText(e)); }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-stone-200 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:px-5">
        <button onClick={onBack} aria-label="Quay lại danh sách tin nhắn" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-stone-100 md:hidden">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <Link href={`/tin/${conv.listingId}`} className="group flex min-w-0 flex-1 items-center gap-3">
          <Thumb url={conv.listing.thumbUrl} className="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate font-semibold group-hover:text-emerald-700">{conv.listing.title}</p>
            <p className="text-sm text-stone-500">
              {conv.listing.price ? <span className="font-semibold text-stone-800">{vnd(conv.listing.price)}</span> : null}
              {conv.listing.price ? ", " : ""}{conv.role === "buyer" ? "bạn đang hỏi người bán" : "khách đang hỏi tin của bạn"}
            </p>
          </div>
        </Link>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto bg-stone-50 px-3 py-4 md:px-6">
        {msgs.length === 0 && (
          <p className="mx-auto mt-6 max-w-xs text-center text-sm text-stone-500">
            {conv.role === "buyer" ? "Chào người bán, hỏi cây còn không, xin thêm ảnh hoặc hẹn giờ xem cây." : "Chưa có tin nhắn."}
          </p>
        )}
        {msgs.map((m, i) => {
          const mine = m.senderId === meId;
          const prev = msgs[i - 1];
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          const grouped = !newDay && prev && prev.senderId === m.senderId && prev.type !== "System";
          return (
            <div key={m.id}>
              {newDay && <p className="my-4 text-center text-xs font-semibold text-stone-500">{dayLabel(m.createdAt)}</p>}
              {m.type === "System" ? (
                <p className="mx-auto my-3 max-w-sm rounded-xl bg-stone-100 px-3 py-2 text-center text-sm text-stone-600">{m.text}</p>
              ) : (
                <div className={`flex flex-col ${mine ? "items-end" : "items-start"} ${grouped ? "" : "mt-3"}`}>
                  {m.warning && <p role="alert" className="mb-1 max-w-[85%] rounded-xl bg-wood-100 px-3 py-2 text-sm text-wood-800 ring-1 ring-wood-200">{m.warning}</p>}
                  {m.type === "Offer" && m.offer ? (
                    <OfferBubble m={m} mine={mine} canRespond={!mine && conv.role === "seller" && m.offer.status === "Pending"}
                      canCreateOrder={conv.role === "seller" && m.offer.status === "Accepted"} onRespond={respond} />
                  ) : (
                    <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 ${mine ? "rounded-br-lg bg-emerald-700 text-white" : "rounded-bl-lg bg-white text-stone-900 ring-1 ring-stone-200"}`}>
                      {m.type === "Text" && <p className="whitespace-pre-line break-words">{m.text}</p>}
                      {m.type === "Image" && m.mediaIds.map((id) => (
                        <a key={id} href={`/media/${id}/full.webp`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/media/${id}/card.webp`} alt="Ảnh đã gửi" className="-mx-2 max-h-72 rounded-2xl" />
                        </a>
                      ))}
                      {m.type === "Location" && <a className="font-semibold underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}>Xem vị trí trên bản đồ</a>}
                    </div>
                  )}
                  <span className="mt-1 px-1 text-[11px] text-stone-500">{clock(m.createdAt)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button onClick={() => setError(undefined)} className="font-semibold underline">Đóng</button>
        </div>
      )}

      {conv.blocked ? (
        <p className="border-t border-stone-200 p-4 text-center text-sm text-stone-500">Cuộc trò chuyện này đã bị chặn nên không gửi thêm tin được.</p>
      ) : (
        <div className="space-y-2 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {offerOpen && (
            <form onSubmit={sendOffer} className="flex items-center gap-2 rounded-2xl bg-wood-100 p-2 ring-1 ring-wood-200">
              <label htmlFor="offer" className="sr-only shrink-0 pl-2 text-sm font-semibold text-wood-800 sm:not-sr-only">Giá bạn muốn trả</label>
              <input id="offer" inputMode="numeric" autoFocus value={offer} placeholder="Giá bạn muốn trả, đ"
                onChange={(e) => { const n = e.target.value.replace(/\D/g, ""); setOffer(n ? Number(n).toLocaleString("vi-VN") : ""); }}
                className="h-10 min-w-0 flex-1 rounded-full bg-white px-4 focus:outline-none" />
              <button disabled={!offer || sending} className="h-10 shrink-0 rounded-full bg-stone-900 px-4 text-sm font-semibold text-wood-400 disabled:opacity-40">Gửi giá</button>
              <button type="button" onClick={() => setOfferOpen(false)} aria-label="Đóng ô trả giá" className="h-10 w-10 shrink-0 rounded-full text-stone-600 hover:bg-white">✕</button>
            </form>
          )}
          <form onSubmit={sendText} className="flex items-end gap-2">
            <label title="Gửi ảnh" className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 ${uploading ? "opacity-40" : ""}`}>
              <span className="sr-only">Gửi ảnh</span>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" strokeLinejoin="round" /></svg>
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { sendPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {conv.role === "buyer" && !offerOpen && (
              <button type="button" onClick={() => setOfferOpen(true)} className="h-11 shrink-0 rounded-full bg-wood-400 px-4 text-sm font-semibold text-stone-900 hover:bg-wood-200">Trả giá</button>
            )}
            <label htmlFor="chat-text" className="sr-only">Tin nhắn</label>
            <textarea id="chat-text" value={text} rows={1} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendText(); } }}
              placeholder={uploading ? "Đang gửi ảnh…" : "Nhắn tin…"}
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-3xl border border-stone-300 bg-stone-50 px-4 py-2.5 focus:border-emerald-600 focus:outline-none [field-sizing:content]" />
            <button disabled={!text.trim() || sending} aria-label="Gửi tin nhắn" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-stone-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M3.4 20.4l17.4-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.1L4 11l9 1-9 1-2 6.3a1 1 0 001.4 1.1z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function OfferBubble({ m, mine, canRespond, canCreateOrder, onRespond }: {
  m: Msg; mine: boolean; canRespond: boolean; canCreateOrder: boolean; onRespond: (id: string, accept: boolean, counter?: number) => void;
}) {
  const [countering, setCountering] = useState(false);
  const [counter, setCounter] = useState("");
  const o = m.offer!;
  return (
    <div className="w-72 max-w-[85%] overflow-hidden rounded-3xl bg-white ring-2 ring-wood-400">
      <div className="bg-wood-400 px-4 py-3 text-stone-900">
        <p className="text-sm font-semibold">{mine ? "Bạn đề nghị giá" : "Khách đề nghị giá"}</p>
        <p className="font-display text-2xl font-extrabold">{vnd(o.amount)}</p>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <p className="text-stone-600">{OFFER_STATUS[o.status] ?? o.status}</p>
        {canRespond && !countering && (
          <div className="flex gap-2">
            <button onClick={() => onRespond(m.id, true)} className="flex-1 rounded-full bg-emerald-700 py-2 font-semibold text-white hover:bg-emerald-800">Đồng ý</button>
            <button onClick={() => setCountering(true)} className="flex-1 rounded-full py-2 font-semibold ring-1 ring-stone-300 hover:bg-stone-50">Trả giá khác</button>
          </div>
        )}
        {canRespond && countering && (
          <form onSubmit={(e) => { e.preventDefault(); onRespond(m.id, false, Number(counter.replace(/\D/g, "")) || undefined); }} className="space-y-2">
            <input inputMode="numeric" autoFocus value={counter} placeholder={`Vd: ${shortVnd(Math.round(o.amount * 1.1))}`} aria-label="Giá bạn muốn bán"
              onChange={(e) => { const n = e.target.value.replace(/\D/g, ""); setCounter(n ? Number(n).toLocaleString("vi-VN") : ""); }}
              className="h-10 w-full rounded-full border border-stone-300 px-4 focus:border-emerald-600 focus:outline-none" />
            <div className="flex gap-2">
              <button className="flex-1 rounded-full bg-stone-900 py-2 font-semibold text-wood-400">{counter ? "Gửi giá này" : "Từ chối"}</button>
              <button type="button" onClick={() => setCountering(false)} className="rounded-full px-3 py-2 text-stone-600 hover:bg-stone-100">Hủy</button>
            </div>
          </form>
        )}
        {canCreateOrder && (
          <Link href={`/don-hang/moi?offer=${m.id}`} className="block rounded-full bg-emerald-700 py-2 text-center font-semibold text-white hover:bg-emerald-800">Tạo đơn giao dịch đảm bảo</Link>
        )}
      </div>
    </div>
  );
}

function Thumb({ url, className }: { url?: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className={`${className} shrink-0 rounded-2xl object-cover`} /> : <div className={`${className} shrink-0 rounded-2xl bg-emerald-100`} />;
}

export default function ChatPage() {
  return <Suspense><ChatInner /></Suspense>;
}
