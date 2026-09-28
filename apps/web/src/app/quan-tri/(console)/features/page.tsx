"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, PageTitle } from "@/admin/components/ui";
import { api, errorText } from "@/admin/lib/api";

const INFO: Record<string, [string, string]> = {
  escrow: ["Giao dịch đảm bảo", "Chỉ bật khi đã ký hợp đồng đối tác trung gian thanh toán và kế toán thuế xác nhận (BR-ESC-05)."],
  community: ["Cộng đồng", "Hỏi đáp, khoe cây, chia sẻ kinh nghiệm."],
  "ai.identify": ["AI gợi ý loài khi đăng tin", "Cần cấu hình nhà cung cấp (Ai:Provider, Ai:ApiKey) trên server."],
  "search.image": ["Tìm bằng ảnh", "Dùng chung nhà cung cấp AI nhận diện; khách 5 lượt/ngày."],
};

export default function FeaturesPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => { api<Record<string, boolean>>("admin/features").then(setFlags, (e) => setMsg({ kind: "err", text: errorText(e) })); }, []);
  useEffect(load, [load]);

  async function toggle(key: string) {
    const enabled = !flags?.[key];
    const note = prompt(`Lý do ${enabled ? "bật" : "tắt"} "${INFO[key]?.[0] ?? key}" (ghi audit)`);
    if (note === null) return;
    try {
      await api(`admin/features/${encodeURIComponent(key)}`, { method: "PUT", json: { enabled, note } });
      setMsg({ kind: "ok", text: `Đã ${enabled ? "bật" : "tắt"}` }); load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle title="Bật/tắt tính năng" subtitle="Có hiệu lực ngay, không cần triển khai lại (UC-ADM-13)" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Card>
        <ul className="divide-y divide-stone-100">
          {flags && Object.entries(flags).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{INFO[k]?.[0] ?? k}</p>
                <p className="text-sm text-stone-500">{INFO[k]?.[1]}</p>
              </div>
              <button role="switch" aria-checked={v} onClick={() => toggle(k)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${v ? "bg-emerald-600" : "bg-stone-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${v ? "left-5" : "left-0.5"}`} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
