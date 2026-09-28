"use client";

import { useEffect, useState } from "react";
import { Alert, Section, btn, field } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { timeAgo } from "@/lib/format";

export interface ReviewList {
  score: number | null; count: number; purchased: number;
  items: { id: string; reviewerId: string; tier: string; stars: number; tags: string[]; text?: string | null; reply?: { text: string; at: string } | null; createdAt: string }[];
}

const TAGS = ["Cây đúng mô tả", "Nhiệt tình", "Đóng gói kỹ", "Giá hợp lý", "Đúng hẹn"];

/** Danh sách đánh giá + viết đánh giá (sau khi đã chat) + người bán trả lời 1 lần. */
export function ReviewBox({ sellerId, initial }: { sellerId: string; initial: ReviewList | null }) {
  const [data, setData] = useState(initial);
  const [me, setMe] = useState<string>();
  const [writing, setWriting] = useState(false);
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  useEffect(() => { api<{ id: string }>("me").then((m) => setMe(m.id), () => {}); }, []);
  const reload = () => api<ReviewList>(`users/${sellerId}/reviews`).then(setData, () => {});

  async function submit() {
    try {
      await api("reviews", { method: "POST", json: { sellerId, stars, tags, text: text || null } });
      setWriting(false); setMsg({ kind: "ok", text: "Cảm ơn bạn đã đánh giá" }); reload();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function reply(id: string) {
    try { await api(`reviews/${id}/reply`, { method: "POST", json: { text: replies[id] } }); reload(); }
    catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function report(id: string) {
    await api(`reviews/${id}/report`, { method: "POST" }).catch(() => {});
    setMsg({ kind: "ok", text: "Đã báo cáo đánh giá" });
  }

  const isSeller = me === sellerId;
  return (
    <Section title={`Đánh giá (${data?.count ?? 0})`} action={me && !isSeller && !writing ? <button onClick={() => setWriting(true)} className={btn.small}>Viết đánh giá</button> : undefined}>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {writing && (
        <div className="mb-4 space-y-2 rounded-xl bg-stone-50 p-4">
          <p className="text-sm text-stone-600">Bạn đánh giá được sau khi người bán đã trả lời bạn trong chat ít nhất 24 giờ.</p>
          <div className="flex gap-1 text-2xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} sao`} className="text-amber-500">{n <= stars ? "★" : "☆"}</button>)}</div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button key={t} type="button" onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
                className={`rounded-full px-3 py-1 text-sm ${tags.includes(t) ? "bg-emerald-700 text-white" : "border border-stone-300 bg-white"}`}>{t}</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} className={field} placeholder="Nhận xét (không ghi SĐT, link)" />
          <div className="flex gap-2"><button onClick={submit} className={btn.primary}>Gửi</button><button onClick={() => setWriting(false)} className={btn.secondary}>Hủy</button></div>
        </div>
      )}
      {data?.items.length === 0 && <p className="text-sm text-stone-500">Chưa có đánh giá.</p>}
      <ul className="divide-y divide-stone-100">
        {data?.items.map((r) => (
          <li key={r.id} className="space-y-1 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-amber-500">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
              {r.tier === "Purchased" && <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">Đã mua hàng</span>}
              <span className="text-stone-400">{timeAgo(r.createdAt)}</span>
              <button onClick={() => report(r.id)} className="ml-auto text-xs text-stone-400 hover:underline">Báo cáo</button>
            </div>
            {r.tags.length > 0 && <p className="text-xs text-stone-600">{r.tags.join(" · ")}</p>}
            {r.text && <p className="text-[15px]">{r.text}</p>}
            {r.reply ? (
              <p className="ml-4 rounded-lg bg-stone-50 p-2 text-sm"><b>Người bán trả lời:</b> {r.reply.text}</p>
            ) : isSeller && (
              <div className="ml-4 flex gap-2">
                <input value={replies[r.id] ?? ""} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} className={field} placeholder="Trả lời công khai (chỉ 1 lần)" />
                <button onClick={() => reply(r.id)} disabled={!replies[r.id]?.trim()} className={btn.small}>Gửi</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
