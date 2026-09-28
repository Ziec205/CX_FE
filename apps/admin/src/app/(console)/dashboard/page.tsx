"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/AdminContext";
import { Alert, Card, PageTitle, btn, input } from "@/components/ui";
import { api, errorText, formatVnd } from "@/lib/api";

interface Dashboard {
  listings: { active: number; newToday: number; pendingReview: number };
  moderationCasesOpen: number;
  users: { total: number; newToday: number; newWeek: number; verifiedGardens: number };
  revenue7d: { topUpVnd: number; topUpCount: number };
  escrow7d: { gmv: number; orders: number };
  disputesOpen: number; payoutsPending: number; ticketsOverdue: number; communityPostsWeek: number;
}
interface Liquidity { category: string; province: string; listings: number; liquidity: number }

function Stat({ label, value, href, warn }: { label: string; value: React.ReactNode; href?: string; warn?: boolean }) {
  const body = (
    <div className={`rounded-lg border bg-white p-4 ${warn ? "border-amber-300" : "border-stone-200"}`}>
      <p className="text-xs uppercase text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${warn ? "text-amber-700" : ""}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function DashboardPage() {
  const { can } = useAdmin();
  const [d, setD] = useState<Dashboard>();
  const [liq, setLiq] = useState<Liquidity[]>();
  const [error, setError] = useState<string>();
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    api<Dashboard>("admin/reports/dashboard").then((r) => { if (!cancelled) setD(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    api<Liquidity[]>("admin/reports/liquidity").then((r) => { if (!cancelled) setLiq(r); }, () => {});
    return () => { cancelled = true; };
  }, []);

  async function exportCsv(kind: string) {
    setError(undefined);
    const res = await fetch(`/api/proxy/admin/reports/export/${kind}?from=${from}&to=${to}T23:59:59Z`);
    if (!res.ok) { setError("Xuất báo cáo thất bại"); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: `${kind}-${from}-${to}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <PageTitle title="Dashboard" subtitle="Số liệu vận hành sàn (7 ngày gần nhất với doanh thu & GMV)" />
      {error && <Alert>{error}</Alert>}
      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Tin đang hiển thị" value={d.listings.active.toLocaleString("vi-VN")} />
            <Stat label="Tin mới hôm nay" value={d.listings.newToday} />
            <Stat label="Hồ sơ kiểm duyệt mở" value={d.moderationCasesOpen} href="/moderation" warn={d.moderationCasesOpen > 50} />
            <Stat label="Người dùng mới (7 ngày)" value={d.users.newWeek} />
            <Stat label="Nạp Xu (7 ngày)" value={formatVnd(d.revenue7d.topUpVnd)} />
            <Stat label="GMV đảm bảo (7 ngày)" value={formatVnd(d.escrow7d.gmv)} />
            <Stat label="Khiếu nại đang mở" value={d.disputesOpen} href="/escrow?status=Disputed" warn={d.disputesOpen > 0} />
            <Stat label="Chờ quyết toán" value={d.payoutsPending} href="/payouts" warn={d.payoutsPending > 0} />
            <Stat label="Ticket quá hạn SLA" value={d.ticketsOverdue} href="/support" warn={d.ticketsOverdue > 0} />
            <Stat label="Nhà vườn đã xác minh" value={d.users.verifiedGardens} />
            <Stat label="Tổng người dùng" value={d.users.total.toLocaleString("vi-VN")} />
            <Stat label="Bài cộng đồng (7 ngày)" value={d.communityPostsWeek} />
          </div>
        </>
      )}

      <Card title="Thanh khoản theo danh mục × tỉnh (30 ngày)">
        <p className="mb-2 text-xs text-stone-500">Tỉ lệ tin có ít nhất một hội thoại được người bán trả lời.</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-stone-500"><th className="py-1">Danh mục</th><th>Tỉnh</th><th className="text-right">Tin</th><th className="text-right">Thanh khoản</th></tr></thead>
          <tbody>
            {liq?.slice(0, 30).map((r) => (
              <tr key={`${r.category}-${r.province}`} className="border-t border-stone-100">
                <td className="py-1">{r.category}</td><td>{r.province}</td><td className="text-right">{r.listings}</td>
                <td className={`text-right ${r.liquidity >= 0.3 ? "text-emerald-700" : "text-amber-700"}`}>{Math.round(r.liquidity * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {can("reports.view") && (
        <Card title="Xuất báo cáo CSV">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
            <span>→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
            <button onClick={() => exportCsv("escrow-orders")} className={btn.secondary}>Đơn đảm bảo</button>
            <button onClick={() => exportCsv("topups")} className={btn.secondary}>Nạp Xu</button>
            <button onClick={() => exportCsv("sellers")} className={btn.secondary}>Doanh thu người bán (thuế)</button>
          </div>
        </Card>
      )}
    </div>
  );
}
