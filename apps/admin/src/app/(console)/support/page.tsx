"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Card, PageTitle, Pill, btn, input } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface Ticket {
  id: string; userId: string; topic: string; subject: string; status: string; dueAt: string; orderId?: string | null; listingId?: string | null;
  messages: { authorId: string; fromStaff: boolean; text: string; at: string }[]; updatedAt: string;
}
const STATUS: Record<string, string> = { Open: "Chờ CSKH", WaitingCustomer: "Chờ khách", Resolved: "Đã giải quyết", Closed: "Đóng" };

export default function SupportAdminPage() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Ticket[]>();
  const [open, setOpen] = useState<Ticket>();
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => {
    api<Ticket[]>(`admin/support/tickets${status ? `?status=${status}` : ""}`).then(setRows, (e) => setMsg({ kind: "err", text: errorText(e) }));
  }, [status]);
  useEffect(load, [load]);

  async function send() {
    if (!open) return;
    try {
      await api(`admin/support/tickets/${open.id}/reply`, { method: "POST", json: { message: reply } });
      setReply("");
      setOpen(await api<Ticket>(`admin/support/tickets/${open.id}`));
      load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function setTicketStatus(s: string) {
    if (!open) return;
    try {
      await api(`admin/support/tickets/${open.id}`, { method: "POST", json: { status: s } });
      setOpen(await api<Ticket>(`admin/support/tickets/${open.id}`)); load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  const [now] = useState(() => Date.now());
  return (
    <div className="max-w-6xl">
      <PageTitle title="Hỗ trợ khách hàng" subtitle="SLA: ticket thường 24 giờ, ticket gắn đơn đảm bảo 4 giờ" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} mb-2`}>
            <option value="">Đang mở</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white text-sm">
            {rows?.map((t) => {
              const overdue = t.status === "Open" && new Date(t.dueAt).getTime() < now;
              return (
                <li key={t.id}>
                  <button onClick={() => setOpen(t)} className={`w-full p-3 text-left hover:bg-stone-50 ${open?.id === t.id ? "bg-emerald-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2"><b className="truncate">{t.subject}</b><Pill value={overdue ? "Priority" : "Normal"} label={overdue ? "Quá hạn" : STATUS[t.status]} /></div>
                    <span className="text-xs text-stone-500">{t.topic} · hạn {formatDate(t.dueAt)}{t.orderId && " · có đơn"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {rows?.length === 0 && <p className="mt-2 text-sm text-stone-500">Không có ticket.</p>}
        </div>
        {open && (
          <Card title={open.subject}>
            <p className="mb-2 text-xs text-stone-500">
              Người dùng <Link href={`/members/${open.userId}`} className="text-emerald-700">{open.userId}</Link>
              {open.orderId && <> · Đơn <Link href={`/escrow/${open.orderId}`} className="text-emerald-700">{open.orderId}</Link></>}
            </p>
            <ul className="max-h-[50vh] space-y-2 overflow-auto text-sm">
              {open.messages.map((m, i) => (
                <li key={i} className={`rounded p-2 ${m.fromStaff ? "bg-emerald-50" : "bg-stone-50"}`}>
                  <span className="text-xs text-stone-500">{m.fromStaff ? "CSKH" : "Khách"} · {formatDate(m.at)}</span>
                  <p className="whitespace-pre-line">{m.text}</p>
                </li>
              ))}
            </ul>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} className={`${input} mt-3 w-full`} placeholder="Trả lời khách…" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={send} disabled={!reply.trim()} className={btn.primary}>Gửi trả lời</button>
              <button onClick={() => setTicketStatus("Resolved")} className={btn.secondary}>Đánh dấu đã giải quyết</button>
              <button onClick={() => setTicketStatus("Closed")} className={btn.secondary}>Đóng</button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
