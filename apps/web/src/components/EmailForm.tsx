"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/api";
import type { Me } from "@/lib/types";
import { btn, field } from "./ui";

/** Ô email nhận nhắc lịch chăm cây (lưu vào hồ sơ). Để trống rồi lưu là xóa email, nhắc lịch ngừng gửi. */
export function EmailForm({ email, onSaved, compact = false }: { email?: string | null; onSaved: (me: Me) => void; compact?: boolean }) {
  const [value, setValue] = useState(email ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(undefined);
    try {
      const me = await api<Me>("me", { method: "PUT", json: { email: value.trim() } });
      onSaved(me);
      setMsg({ ok: true, text: me.email ? "Đã lưu email nhận nhắc lịch." : "Đã xóa email. Nhắc lịch sẽ ngừng gửi." });
    } catch (err) { setMsg({ ok: false, text: errorText(err) }); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <div className={`flex gap-2 ${compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row"}`}>
        <label htmlFor="reminder-email" className="sr-only">Email nhận nhắc lịch</label>
        <input id="reminder-email" type="email" inputMode="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="ten@gmail.com" maxLength={254} className={`${field} sm:flex-1`} />
        <button disabled={busy || value.trim() === (email ?? "")} className={btn.primary}>{busy ? "Đang lưu…" : "Lưu email"}</button>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
