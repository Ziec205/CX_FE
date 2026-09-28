"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Alert, btn, field } from "@/components/ui";
import { api, errorText, uploadPhoto } from "@/lib/api";
import { timeAgo } from "@/lib/format";
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

function ChatInner() {
  const router = useRouter();
  const active = useSearchParams().get("c");
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [meId, setMeId] = useState<string>();
  const [text, setText] = useState("");
  const [offer, setOffer] = useState("");
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<Conv>();
  // Hội thoại vừa tạo chưa có tin nhắn nên chưa nằm trong danh sách: lấy riêng theo id.
  const current = convs.find((c) => c.id === active) ?? (opened?.id === active ? opened : undefined);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    api<Conv>(`conversations/${active}`).then((c) => { if (!cancelled) setOpened(c); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api<Conv[]>("conversations").then((r) => { if (!cancelled) setConvs(r); }, () => {});
      if (active) api<Msg[]>(`conversations/${active}/messages`).then((r) => { if (!cancelled) setMsgs(r.reverse()); }, (e) => { if (!cancelled) setError(errorText(e)); });
    };
    api<{ id: string }>("me").then((m) => { if (!cancelled) setMeId(m.id); }, () => {});
    tick();
    const t = setInterval(tick, POLL_MS);
    if (active) api(`conversations/${active}/read`, { method: "POST" }).catch(() => {});
    return () => { cancelled = true; clearInterval(t); };
  }, [active]);

  useEffect(() => {
    const conn = createChatConnection();
    conn.on("message", (m: Msg & { conversationId: string }) => {
      if (m.conversationId === active) {
        // Có id rồi thì thay (vd đề nghị giá vừa đổi trạng thái), chưa có thì thêm.
        setMsgs((x) => (x.some((y) => y.id === m.id) ? x.map((y) => (y.id === m.id ? m : y)) : [...x, m]));
        api(`conversations/${active}/read`, { method: "POST" }).catch(() => {});
      }
      api<Conv[]>("conversations").then(setConvs, () => {});
    });
    conn.start().catch(() => {}); // lỗi kết nối: polling dự phòng vẫn chạy
    return () => { conn.stop(); };
  }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send(body: Record<string, unknown>) {
    if (!active) return;
    try {
      const m = await api<Msg>(`conversations/${active}/messages`, { method: "POST", json: body });
      setMsgs((x) => [...x, m]);
      setText(""); setOffer("");
    } catch (e) { setError(errorText(e)); }
  }

  async function sendPhoto(f: File | undefined) {
    if (!f) return;
    try { const p = await uploadPhoto(f); await send({ type: "Image", mediaIds: [p.id] }); } catch (e) { setError(errorText(e)); }
  }

  async function respond(messageId: string, accept: boolean) {
    const counter = accept ? null : Number(prompt("Trả giá (để trống = từ chối)", "") || 0) || null;
    try {
      await api(`conversations/${active}/offers/${messageId}/respond`, { method: "POST", json: { accept, counterAmount: counter } });
      setMsgs(await api<Msg[]>(`conversations/${active}/messages`).then((r) => r.reverse()));
    } catch (e) { setError(errorText(e)); }
  }

  return (
    <div className="grid h-[calc(100vh-10rem)] min-h-[480px] overflow-hidden rounded-xl border border-stone-200 bg-white md:grid-cols-[300px_1fr]">
      <aside className={`overflow-y-auto border-r border-stone-100 ${active ? "hidden md:block" : ""}`}>
        {convs.length === 0 && <p className="p-4 text-sm text-stone-500">Chưa có cuộc trò chuyện.</p>}
        {convs.map((c) => (
          <button key={c.id} onClick={() => router.push(`/tin-nhan?c=${c.id}`)} className={`flex w-full gap-2 border-b border-stone-50 p-3 text-left ${c.id === active ? "bg-emerald-50" : "hover:bg-stone-50"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.listing.thumbUrl ? <img src={c.listing.thumbUrl} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-stone-100" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.listing.title}</p>
              <p className="truncate text-xs text-stone-500">{c.role === "buyer" ? "Bạn mua" : "Bạn bán"} · {c.last?.preview}</p>
              <p className="text-[11px] text-stone-400">{timeAgo(c.last?.at)}</p>
            </div>
            {c.unread > 0 && <span className="h-5 min-w-5 rounded-full bg-emerald-800 px-1.5 text-center text-xs text-white">{c.unread}</span>}
          </button>
        ))}
      </aside>

      <section className={`flex min-h-0 flex-col ${active ? "" : "hidden md:flex"}`}>
        {!current ? <p className="m-auto text-sm text-stone-400">Chọn một cuộc trò chuyện</p> : (
          <>
            <header className="flex items-center gap-2 border-b border-stone-100 p-3">
              <button onClick={() => router.push("/tin-nhan")} className="md:hidden">←</button>
              <Link href={`/tin/${current.listingId}`} className="truncate font-medium hover:text-emerald-700">{current.listing.title}</Link>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {msgs.map((m) => {
                const mine = m.senderId === meId;
                if (m.type === "System") return <p key={m.id} className="text-center text-xs text-stone-500">{m.text}</p>;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {m.warning && <div className="mb-1 max-w-[85%] rounded-lg bg-wood-100 p-2 text-sm text-wood-800">{m.warning}</div>}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>
                      {m.type === "Text" && <span className="whitespace-pre-line">{m.text}</span>}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {m.type === "Image" && m.mediaIds.map((id) => <img key={id} src={`/media/${id}/card.webp`} alt="" className="max-h-60 rounded-lg" />)}
                      {m.type === "Location" && <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}>Xem vị trí trên bản đồ</a>}
                      {m.type === "Offer" && m.offer && (
                        <div>
                          <p>Đề nghị giá <b>{m.offer.amount.toLocaleString("vi-VN")}đ</b></p>
                          <p className="text-xs opacity-80">{({ Pending: "Chờ phản hồi", Accepted: "Đã đồng ý", Rejected: "Đã từ chối", Countered: "Đã trả giá" } as Record<string, string>)[m.offer.status]}</p>
                          {!mine && current.role === "seller" && m.offer.status === "Pending" && (
                            <div className="mt-1 flex gap-1">
                              <button onClick={() => respond(m.id, true)} className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white">Đồng ý</button>
                              <button onClick={() => respond(m.id, false)} className="rounded bg-white px-2 py-0.5 text-xs">Trả giá / từ chối</button>
                            </div>
                          )}
                          {current.role === "seller" && m.offer.status === "Accepted" && (
                            <Link href={`/don-hang/moi?offer=${m.id}`} className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-xs text-emerald-800">🛡 Tạo đơn đảm bảo</Link>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="mt-0.5 text-[10px] text-stone-400">{timeAgo(m.createdAt)}</span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            {error && <div className="px-3"><Alert>{error}</Alert></div>}
            {current.blocked ? <p className="p-3 text-center text-sm text-stone-500">Cuộc trò chuyện đã bị chặn</p> : (
              <div className="space-y-2 border-t border-stone-100 p-3">
                {current.role === "buyer" && (
                  <div className="flex gap-2">
                    <input type="number" min={1000} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Đề nghị giá (đồng)" className={field} />
                    <button onClick={() => send({ type: "Offer", offerAmount: Number(offer) })} disabled={!offer} className={btn.secondary}>Gửi giá</button>
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send({ type: "Text", text }); }} className="flex gap-2">
                  <label className={`${btn.secondary} cursor-pointer`} title="Gửi ảnh">Ảnh<input type="file" accept="image/*" className="hidden" onChange={(e) => sendPhoto(e.target.files?.[0])} /></label>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập tin nhắn…" className={field} />
                  <button className={btn.primary}>Gửi</button>
                </form>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function ChatPage() {
  return <Suspense><ChatInner /></Suspense>;
}
