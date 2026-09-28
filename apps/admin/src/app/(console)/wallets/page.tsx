"use client";

import { useEffect, useState } from "react";
import { Alert, Card, PageTitle, btn, input } from "@/components/ui";
import { api, errorText, formatDate } from "@/lib/api";

interface UserInfo { id: string; phone: string; displayName: string; fullName?: string; status: string; activeViolationPoints: number }
interface Lot { kind: string; amount: number; remaining: number; expiresAt?: string }
interface Entry { id: string; amount: number; type: string; note?: string; createdAt: string }
interface Adjustment { id: string; userId: string; amount: number; kind: string; reason: string; requestedById: string; status: string; createdAt: string }

export default function WalletsPage() {
  const [q, setQ] = useState("");
  const [user, setUser] = useState<UserInfo>();
  const [wallet, setWallet] = useState<{ wallet: { lots: Lot[]; frozen: boolean }; ledger: Entry[] }>();
  const [pending, setPending] = useState<Adjustment[]>([]);
  const [adj, setAdj] = useState({ amount: 0, kind: "Bonus", reason: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [reload, setReload] = useState(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    api<Adjustment[]>("admin/wallets/adjustments?status=Pending").then((r) => { if (!cancelled) setPending(r); }, () => {});
    return () => { cancelled = true; };
  }, [reload]);

  async function lookup(id?: string) {
    try {
      const u = await api<UserInfo>(`admin/users/lookup?q=${encodeURIComponent(id ?? q)}`);
      setUser(u);
      setWallet(await api(`admin/wallets/${u.id}`));
      setMsg(undefined);
    } catch (e) { setUser(undefined); setWallet(undefined); setMsg({ kind: "err", text: (e as { status?: number }).status === 404 ? "Không tìm thấy người dùng" : errorText(e) }); }
  }

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      const r = await api<Adjustment>(`admin/wallets/${user.id}/adjustments`, { method: "POST", json: adj });
      setMsg({ kind: "ok", text: r.status === "Applied" ? "Đã điều chỉnh" : "Vượt 50 Xu: đã tạo yêu cầu, cần người thứ hai duyệt" });
      setAdj({ amount: 0, kind: "Bonus", reason: "" });
      setReload((x) => x + 1);
      await lookup(user.id);
    } catch (err) { setMsg({ kind: "err", text: errorText(err) }); }
  }

  async function approve(id: string) {
    try {
      await api(`admin/wallets/adjustments/${id}/approve`, { method: "POST" });
      setMsg({ kind: "ok", text: "Đã duyệt điều chỉnh" });
      setReload((x) => x + 1);
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  const live = wallet?.wallet.lots.filter((l) => l.remaining > 0 && (!l.expiresAt || new Date(l.expiresAt).getTime() > now)) ?? [];

  return (
    <div className="max-w-6xl">
      <PageTitle title="Ví Xu người dùng" subtitle="Tra cứu, điều chỉnh (≤ 50 Xu áp dụng ngay, lớn hơn cần 2 người duyệt)" />
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      {pending.length > 0 && (
        <Card title={`Yêu cầu chờ duyệt (${pending.length})`} className="mb-4">
          <table className="w-full text-sm">
            <tbody>
              {pending.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="py-2">{formatDate(p.createdAt)}</td><td>{p.userId}</td>
                  <td className={p.amount > 0 ? "text-emerald-700" : "text-red-700"}>{p.amount > 0 ? "+" : ""}{p.amount} Xu ({p.kind})</td>
                  <td>{p.reason}</td><td className="text-right"><button onClick={() => approve(p.id)} className={btn.primary}>Duyệt</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="mb-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SĐT hoặc mã người dùng" className={`${input} w-72`} />
        <button className={btn.secondary}>Tra cứu</button>
      </form>

      {user && wallet && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title={`${user.displayName} · ${user.phone}`} className="lg:col-span-2">
            <p className="mb-2 text-sm">Số dư: <b>{live.reduce((s, l) => s + l.remaining, 0)} Xu</b>{wallet.wallet.frozen && <span className="ml-2 text-red-700">(đang đóng băng)</span>}</p>
            <table className="w-full text-sm">
              <thead className="text-left text-stone-500"><tr><th className="py-1">Thời gian</th><th>Loại</th><th>Số Xu</th><th>Ghi chú</th></tr></thead>
              <tbody>
                {wallet.ledger.map((e) => (
                  <tr key={e.id} className="border-t border-stone-100">
                    <td className="py-1">{formatDate(e.createdAt)}</td><td>{e.type}</td>
                    <td className={e.amount > 0 ? "text-emerald-700" : "text-red-700"}>{e.amount > 0 ? "+" : ""}{e.amount}</td><td>{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Điều chỉnh">
            <form onSubmit={adjust} className="space-y-2 text-sm">
              <input type="number" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: Number(e.target.value) })} className={`${input} w-full`} />
              <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })} className={`${input} w-full`}>
                <option value="Bonus">Xu thưởng (hạn 90 ngày)</option><option value="Paid">Xu nạp</option>
              </select>
              <input required placeholder="Lý do" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className={`${input} w-full`} />
              <button disabled={adj.amount === 0} className={`${btn.primary} w-full`}>Gửi</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
