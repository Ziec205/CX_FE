"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Alert, Label, Section, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";

interface Ticket {
  id: string; topic: string; subject: string; status: string; orderId?: string | null; createdAt: string; updatedAt: string;
  messages: { authorId: string; fromStaff: boolean; text: string; at: string }[];
}

const TOPICS: [string, string][] = [["Account", "Tài khoản"], ["Listing", "Tin đăng"], ["Order", "Đơn đảm bảo"], ["Payment", "Nạp Xu / thanh toán"], ["Report", "Tố cáo lừa đảo"], ["Other", "Khác"]];
const STATUS: Record<string, string> = { Open: "Đang xử lý", WaitingCustomer: "CSKH đã trả lời", Resolved: "Đã giải quyết", Closed: "Đã đóng" };

const FAQ: [string, string][] = [
  ["Làm sao tránh bị lừa khi mua cây?", "Không chuyển cọc trước cho người lạ. Ưu tiên xem cây tận mắt hoặc dùng Giao dịch đảm bảo — tiền chỉ đến người bán khi bạn nhận cây đúng mô tả."],
  ["Tin của tôi bị từ chối?", "Xem lý do trong mục Tài khoản → Tin của tôi. Sửa theo gợi ý rồi gửi duyệt lại, hoặc gửi yêu cầu hỗ trợ bên dưới."],
  ["Cây nhận về bị héo?", "Trong 48 giờ sau khi nhận, vào Đơn hàng → Khiếu nại, kèm video mở hàng liền mạch."],
  ["Xu Xanh có rút ra tiền được không?", "Không. Xu dùng để trả phí dịch vụ trên Chạm Xanh (đẩy tin, Tin Ưu tiên, Gói Nhà vườn)."],
];

export default function SupportPage() {
  return <Suspense><Support /></Suspense>;
}

function Support() {
  const router = useRouter();
  const orderId = useSearchParams().get("order");
  const [tickets, setTickets] = useState<Ticket[]>();
  const [open, setOpen] = useState<Ticket>();
  const [topic, setTopic] = useState(orderId ? "Order" : "Account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();

  const load = useCallback(() => {
    api<Ticket[]>("support/tickets").then(setTickets, (e) => { if ((e as ApiError).status !== 401) setError(errorText(e)); });
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await api("support/tickets", { method: "POST", json: { topic, subject, message, orderId } });
      setSubject(""); setMessage(""); setOk("Đã gửi. CSKH phản hồi trong 24 giờ (đơn đảm bảo: 4 giờ, giờ hành chính)."); load();
    } catch (err) {
      if ((err as ApiError).status === 401) router.push("/dang-nhap?next=/ho-tro");
      else setError(errorText(err));
    }
  }
  async function sendReply() {
    if (!open) return;
    try {
      await api(`support/tickets/${open.id}/reply`, { method: "POST", json: { message: reply } });
      setReply("");
      setOpen(await api<Ticket>(`support/tickets/${open.id}`));
      load();
    } catch (err) { setError(errorText(err)); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <h1 className="text-4xl font-extrabold text-emerald-900">Trung tâm trợ giúp</h1>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-stone-200 bg-white p-4">
              <summary className="cursor-pointer font-bold">{q}</summary>
              <p className="mt-2 text-stone-700">{a}</p>
            </details>
          ))}
        </div>
        <Section title="Gửi yêu cầu hỗ trợ">
          <form onSubmit={create} className="space-y-3">
            <Label text="Chủ đề"><select value={topic} onChange={(e) => setTopic(e.target.value)} className={field}>{TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Label>
            <Label text="Tiêu đề" required><input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={5} maxLength={150} className={field} /></Label>
            <Label text="Nội dung" required><textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} rows={4} className={field} /></Label>
            {orderId && <p className="text-sm text-stone-500">Gắn với đơn đảm bảo này.</p>}
            {error && <Alert>{error}</Alert>}
            {ok && <Alert kind="ok">{ok}</Alert>}
            <button className={btn.primary}>Gửi yêu cầu</button>
          </form>
        </Section>
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl text-emerald-800">Yêu cầu của tôi</h2>
        {tickets?.length === 0 && <p className="text-stone-500">Chưa có yêu cầu nào.</p>}
        <ul className="space-y-2">
          {tickets?.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpen(t)} className={`w-full rounded-xl border bg-white p-3 text-left ${open?.id === t.id ? "border-emerald-600" : "border-stone-200"}`}>
                <b>{t.subject}</b>
                <span className="block text-sm text-stone-500">{STATUS[t.status] ?? t.status} · {new Date(t.updatedAt).toLocaleString("vi-VN")}</span>
              </button>
            </li>
          ))}
        </ul>
        {open && (
          <Section title={open.subject}>
            <ul className="space-y-2">
              {open.messages.map((m, i) => (
                <li key={i} className={`rounded-xl p-3 ${m.fromStaff ? "bg-emerald-50" : "bg-stone-50"}`}>
                  <span className="text-xs text-stone-500">{m.fromStaff ? "CSKH Chạm Xanh" : "Bạn"} · {new Date(m.at).toLocaleString("vi-VN")}</span>
                  <p className="whitespace-pre-line">{m.text}</p>
                </li>
              ))}
            </ul>
            {open.status !== "Closed" && (
              <div className="mt-3 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} className={field} placeholder="Trả lời…" />
                <button onClick={sendReply} className={btn.primary}>Gửi</button>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
