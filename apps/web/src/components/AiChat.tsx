"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, errorText, uploadPhoto, type ApiError } from "@/lib/api";
import { isPlanError } from "@/lib/plans";
import type { AiChatResult, AiConversation, AiMessage, AiQuota } from "@/lib/types";
import { AiMarkdown } from "./AiMarkdown";
import { Sparkle } from "./PlanGate";

const STARTERS = [
  "Lá trầu bà bị vàng mép, nên xử lý thế nào?",
  "Ban công hướng Tây nắng gắt nên trồng cây gì?",
  "Bao lâu nên tưới sen đá một lần?",
  "Làm sao định giá bonsai mini để bán?",
];

interface Photo { id: string; preview: string }

/** Khung trò chuyện với Trợ lý AI. compact: dùng trong bảng nổi; ngược lại là trang /tro-ly-ai. */
export function AiChat({ conversationId, onConversation, compact = false }: {
  conversationId?: string; onConversation?: (c: AiConversation) => void; compact?: boolean;
}) {
  const [convId, setConvId] = useState(conversationId);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<AiQuota>();
  const [simulated, setSimulated] = useState(false);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; plan: boolean }>();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Cuộc trò chuyện vừa tạo ngay tại đây: trang cha chọn nó thì không cần nạp lại lịch sử.
  const createdHere = useRef<string>(undefined);

  // Trang cha đổi cuộc trò chuyện (bấm trong danh sách): reset trong lúc render, không dùng effect.
  // Trang cha chỉ báo lại đúng cuộc vừa tạo ở đây thì giữ nguyên tin nhắn.
  const [prevProp, setPrevProp] = useState(conversationId);
  if (conversationId !== prevProp) {
    setPrevProp(conversationId);
    if (conversationId !== convId) {
      setConvId(conversationId);
      setMessages([]);
      setError(undefined);
    }
  }

  useEffect(() => {
    api<{ quota: AiQuota; simulated: boolean }>("ai/quota").then((r) => { setQuota(r.quota); setSimulated(r.simulated); }, () => {});
  }, []);

  useEffect(() => {
    if (!conversationId || conversationId === createdHere.current) return;
    let cancelled = false;
    setLoading(true);
    api<{ messages: AiMessage[] }>(`ai/conversations/${conversationId}`)
      .then((r) => { if (!cancelled) setMessages(r.messages); }, (e) => { if (!cancelled) setError({ message: errorText(e), plan: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function attach(files: FileList | null) {
    if (!files) return;
    setUploading(true); setError(undefined);
    try {
      for (const f of Array.from(files).slice(0, 3 - photos.length)) {
        const r = await uploadPhoto(f, "PlantPhoto");
        setPhotos((p) => [...p, { id: r.id, preview: r.urls?.thumb ?? URL.createObjectURL(f) }]);
      }
    } catch (e) { setError({ message: errorText(e), plan: false }); } finally { setUploading(false); }
  }

  async function send(question = text) {
    const q = question.trim();
    if ((!q && photos.length === 0) || sending) return;
    setSending(true); setError(undefined);
    const pending: AiMessage = { id: "pending", role: "user", text: q, offTopic: false, createdAt: new Date().toISOString(), photos: photos.map((p) => p.preview) };
    setMessages((m) => [...m, pending]);
    setText("");
    const sentPhotos = photos;
    setPhotos([]);
    try {
      const r = await api<AiChatResult>("ai/chat", { method: "POST", json: { conversationId: convId ?? null, message: q, mediaIds: sentPhotos.map((p) => p.id) } });
      setMessages((m) => [...m.filter((x) => x.id !== "pending"), r.question, r.reply]);
      setQuota(r.quota);
      if (!convId) { setConvId(r.conversation.id); createdHere.current = r.conversation.id; }
      onConversation?.(r.conversation);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== "pending"));
      setText(q);
      setPhotos(sentPhotos);
      setError({ message: errorText(e), plan: isPlanError(e) });
      if ((e as ApiError).code === "AI_QUOTA_EXCEEDED") setQuota((qt) => (qt ? { ...qt, used: qt.limit, remaining: 0 } : qt));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  const empty = !loading && messages.length === 0;
  return (
    <div className={`flex min-h-0 flex-col ${compact ? "h-full" : "h-[calc(100dvh-14rem)] min-h-[28rem]"}`}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-2" aria-live="polite">
        {loading && <div className="cx-shimmer h-20 rounded-2xl" />}
        {empty && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3">
              <Avatar />
              <div className="rounded-2xl rounded-tl-md bg-emerald-50 px-4 py-3 text-[15px] text-stone-800">
                Chào bạn! Mình là <b>Trợ lý Chạm Xanh</b>. Hỏi mình về chăm cây, sâu bệnh (gửi kèm ảnh), chọn cây hợp chỗ ở, hay cách bán cây nhé.
              </div>
            </div>
            <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={sending}
                  className="rounded-2xl bg-white px-4 py-2.5 text-left text-sm ring-1 ring-stone-200 hover:ring-emerald-600">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => <Bubble key={m.id} m={m} />)}
        {sending && (
          <div className="flex items-start gap-3">
            <Avatar />
            <div className="flex gap-1 rounded-2xl rounded-tl-md bg-emerald-50 px-4 py-4" aria-label="Trợ lý đang trả lời">
              {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-emerald-600" style={{ animationDelay: `${i * 120}ms` }} />)}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className={`mx-1 mb-2 rounded-2xl px-4 py-3 text-sm ${error.plan ? "bg-wood-100 text-wood-800" : "bg-red-50 text-red-800"}`}>
          {error.message}
          {error.plan && <Link href="/goi" className="ml-2 font-semibold underline">Xem các gói</Link>}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-stone-200 pt-3">
        {photos.length > 0 && (
          <div className="mb-2 flex gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Bỏ ảnh" onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <label title="Gửi ảnh cây" className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 ring-stone-300 hover:ring-emerald-700 ${photos.length >= 3 || uploading ? "pointer-events-none opacity-40" : ""}`}>
            <span className="sr-only">Gửi ảnh cây (tối đa 3)</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" />
            </svg>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { attach(e.target.files); e.target.value = ""; }} />
          </label>
          <label htmlFor={compact ? "ai-q-compact" : "ai-q"} className="sr-only">Câu hỏi cho Trợ lý AI</label>
          <textarea id={compact ? "ai-q-compact" : "ai-q"} ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder={uploading ? "Đang tải ảnh…" : "Hỏi về cây của bạn…"}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-stone-300 bg-white px-4 py-2.5 text-[15px] focus:border-emerald-600 focus:outline-none" />
          <button type="submit" disabled={sending || uploading || (!text.trim() && photos.length === 0)} aria-label="Gửi"
            className="cx-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white hover:bg-emerald-700 disabled:bg-stone-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg>
          </button>
        </div>
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-stone-500">
          <span>{quota ? <>Còn <b className="text-stone-700">{quota.remaining}/{quota.limit}</b> lượt hôm nay · làm mới lúc 0 giờ</> : " "}</span>
          <span>{simulated ? "Chế độ thử: chưa nối Gemini" : "AI có thể sai, hãy kiểm tra lại thông tin quan trọng"}</span>
        </p>
      </form>
    </div>
  );
}

function Avatar() {
  return (
    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
      <Sparkle />
    </span>
  );
}

function Bubble({ m }: { m: AiMessage }) {
  if (m.role === "user")
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.photos.length > 0 && (
          <div className="flex gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.photos.map((src) => <img key={src} src={src} alt="Ảnh đã gửi" className="h-20 w-20 rounded-xl object-cover ring-1 ring-stone-200" onError={(e) => { e.currentTarget.style.display = "none"; }} />)}
          </div>
        )}
        {m.text && <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-emerald-800 px-4 py-2.5 text-[15px] text-white">{m.text}</div>}
      </div>
    );
  return (
    <div className="flex items-start gap-3">
      <Avatar />
      <div className={`min-w-0 max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3 text-[15px] text-stone-800 ${m.offTopic ? "bg-stone-100" : "bg-emerald-50"}`}>
        <AiMarkdown text={m.text} />
        {m.offTopic && <p className="mt-1 text-xs text-stone-500">Câu ngoài chủ đề cây cối, không tính lượt.</p>}
      </div>
    </div>
  );
}
