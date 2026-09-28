"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/AdminContext";
import { Alert, Card, PageTitle, btn, input } from "@/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/lib/api";
import { ORDER_LABEL } from "@/lib/escrow";

interface Detail {
  user: { id: string; phone: string; displayName: string; fullName?: string | null; status: string; activeViolationPoints: number;
    postingRestrictedUntil?: string | null; lockedUntil?: string | null; createdAt: string; lastSeenAt?: string | null;
    flags: { hasVerifiedGarden: boolean; hasActivePlan: boolean; isProSeller: boolean } };
  violations: { id: string; points: number; reasonCode: string; listingId?: string | null; createdAt: string; expiresAt: string }[];
  listingCount: number;
  orders: { id: string; code: string; status: string; total: number; role: string; createdAt: string }[];
}

export default function MemberPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const [d, setD] = useState<Detail>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [action, setAction] = useState("warn");
  const [days, setDays] = useState(7);
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  const [expertTitle, setExpertTitle] = useState("");

  const load = useCallback(() => { api<Detail>(`admin/members/${id}`).then(setD, (e) => setMsg({ kind: "err", text: errorText(e) })); }, [id]);
  useEffect(load, [load]);

  async function sanction() {
    try {
      await api(`admin/members/${id}/sanction`, { method: "POST", json: { action, days, points: action === "warn" ? points : null, reason } });
      setMsg({ kind: "ok", text: "Đã áp dụng" }); setReason(""); load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function expert(on: boolean) {
    try {
      await api(`admin/community/experts/${id}`, { method: "PUT", json: { expert: on, title: expertTitle || null } });
      setMsg({ kind: "ok", text: on ? "Đã cấp huy hiệu Chuyên gia" : "Đã thu hồi huy hiệu" });
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  if (!d) return msg ? <Alert kind={msg.kind}>{msg.text}</Alert> : <p className="text-sm text-stone-500">Đang tải…</p>;
  const u = d.user;
  return (
    <div className="max-w-6xl space-y-4">
      <PageTitle title={u.displayName} subtitle={`${u.phone} · ${u.status} · ${u.activeViolationPoints} điểm vi phạm`} action={<Link href="/members" className={btn.secondary}>← Danh sách</Link>} />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Hồ sơ">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-500">Họ tên</dt><dd>{u.fullName ?? "—"}</dd>
            <dt className="text-stone-500">Tham gia</dt><dd>{formatDate(u.createdAt)}</dd>
            <dt className="text-stone-500">Hoạt động gần nhất</dt><dd>{formatDate(u.lastSeenAt)}</dd>
            <dt className="text-stone-500">Nhà vườn</dt><dd>{u.flags.hasVerifiedGarden ? "Đã xác minh" : "Không"}{u.flags.hasActivePlan && " · có gói"}</dd>
            <dt className="text-stone-500">Số tin</dt><dd>{d.listingCount}</dd>
            {u.postingRestrictedUntil && <><dt className="text-stone-500">Hạn chế đến</dt><dd>{formatDate(u.postingRestrictedUntil)}</dd></>}
            {u.lockedUntil && <><dt className="text-stone-500">Khóa đến</dt><dd>{formatDate(u.lockedUntil)}</dd></>}
          </dl>
        </Card>
        <Card title="Xử lý tài khoản">
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <select value={action} onChange={(e) => setAction(e.target.value)} className={input}>
                <option value="warn">Cảnh cáo (+ điểm)</option>
                <option value="restrict">Hạn chế đăng tin</option>
                <option value="lock">Khóa tạm thời</option>
                {can("user.ban_permanent") && <option value="ban">Khóa vĩnh viễn</option>}
                <option value="unlock">Mở khóa</option>
              </select>
              {action === "warn" && <input type="number" min={0} max={10} value={points} onChange={(e) => setPoints(Number(e.target.value))} className={`${input} w-20`} title="Điểm vi phạm" />}
              {(action === "restrict" || action === "lock") && <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${input} w-20`} title="Số ngày" />}
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={`${input} w-full`} placeholder="Lý do (gửi cho người dùng, ghi audit)" />
            <button onClick={sanction} disabled={!reason.trim()} className={action === "unlock" ? btn.primary : btn.danger}>Áp dụng</button>
          </div>
          {can("content.manage") && (
            <div className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-sm">
              <p className="font-medium">Huy hiệu Chuyên gia cộng đồng (BR-COM-04)</p>
              <input value={expertTitle} onChange={(e) => setExpertTitle(e.target.value)} className={`${input} w-full`} placeholder="Vd: Nghệ nhân bonsai, Kỹ sư nông nghiệp" />
              <div className="flex gap-2"><button onClick={() => expert(true)} className={btn.secondary}>Cấp</button><button onClick={() => expert(false)} className={btn.secondary}>Thu hồi</button></div>
            </div>
          )}
        </Card>
        <Card title="Vi phạm (90 ngày)">
          {d.violations.length === 0 ? <p className="text-sm text-stone-500">Không có.</p> : (
            <ul className="space-y-1 text-sm">
              {d.violations.map((v) => <li key={v.id}><b>+{v.points}</b> {v.reasonCode} · {formatDate(v.createdAt)} {v.listingId && <span className="font-mono text-xs text-stone-500">({v.listingId})</span>}</li>)}
            </ul>
          )}
        </Card>
        <Card title="Đơn đảm bảo gần đây">
          {d.orders.length === 0 ? <p className="text-sm text-stone-500">Không có.</p> : (
            <ul className="space-y-1 text-sm">
              {d.orders.map((o) => <li key={o.id}><Link href={`/escrow/${o.id}`} className="font-mono text-emerald-700">{o.code}</Link> · {o.role === "buyer" ? "mua" : "bán"} · {ORDER_LABEL[o.status] ?? o.status} · {formatVnd(o.total)}</li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
