"use client";

import { Fragment, useEffect, useState } from "react";
import { Alert, PageTitle, input } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface Log { id: string; actorName: string; action: string; targetType: string; targetId: string; reason?: string; ip?: string; at: string; before?: string; after?: string }

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ limit: "200", ...(targetType && { targetType }), ...(targetId && { targetId }) });
    api<Log[]>(`admin/audit?${qs}`).then((r) => { if (!cancelled) setLogs(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [targetType, targetId]);

  return (
    <div className="max-w-6xl">
      <PageTitle title="Nhật ký audit" subtitle="Mọi thao tác quản trị, chỉ ghi thêm, không sửa/xóa (BR-ADM-01)" />
      <div className="mb-4 flex gap-2">
        <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className={input}>
          <option value="">Mọi đối tượng</option>
          {["priceBook", "listing", "garden", "wallet", "category", "species", "media", "moderationConfig", "review"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input placeholder="Mã đối tượng" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={input} />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr><th className="px-3 py-2">Thời gian</th><th className="px-3 py-2">Người</th><th className="px-3 py-2">Hành động</th><th className="px-3 py-2">Đối tượng</th><th className="px-3 py-2">Lý do</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <Fragment key={l.id}>
                <tr onClick={() => setOpen(open === l.id ? undefined : l.id)} className="cursor-pointer border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(l.at)}</td><td className="px-3 py-2">{l.actorName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.action}</td><td className="px-3 py-2 text-xs">{l.targetType} · {l.targetId}</td>
                  <td className="px-3 py-2">{l.reason}</td>
                </tr>
                {open === l.id && (l.before || l.after) && (
                  <tr><td colSpan={5} className="bg-stone-50 px-3 py-2">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{l.before && `Trước: ${l.before}\n`}{l.after && `Sau: ${l.after}`}</pre>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
