"use client";

import { useEffect, useState } from "react";
import { Alert, btn, Section } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import type { PublicPricing } from "@/lib/types";

interface Wallet { balance: number; paid: number; bonus: number; expiringSoon: { remaining: number; expiresAt: string }[] }
interface Entry { id: string; amount: number; type: string; note?: string; createdAt: string }
interface TopUp { id: string; snapshot: { priceVnd: number; xu: number; bonusXu: number; packageCode: string }; transferContent: string; bankAccountName: string; expiresAt: string }

const TYPE: Record<string, string> = { TopUp: "Nạp", Bonus: "Thưởng", Spend: "Chi", Refund: "Hoàn", Adjust: "Điều chỉnh", Expire: "Hết hạn" };

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet>();
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [pricing, setPricing] = useState<PublicPricing>();
  const [topUp, setTopUp] = useState<TopUp>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string }>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<Wallet>("wallet"), api<Entry[]>("wallet/ledger"), api<PublicPricing>("pricing/current")])
      .then(([w, l, p]) => { if (!cancelled) { setWallet(w); setLedger(l); setPricing(p); } }, (e) => { if (!cancelled) setMsg({ kind: "err", text: errorText(e) }); });
    return () => { cancelled = true; };
  }, [reload]);

  async function start(code: string) {
    if (!pricing) return;
    try { setTopUp(await api<TopUp>("wallet/topups", { method: "POST", json: { packageCode: code, expectedPriceBookVersion: pricing.version } })); }
    catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  async function devPay() {
    if (!topUp) return;
    const res = await fetch("/api/dev/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topUpId: topUp.id, amountVnd: topUp.snapshot.priceVnd }) });
    if (res.ok) { setTopUp(undefined); setMsg({ kind: "ok", text: "Nạp Xu thành công" }); setReload((x) => x + 1); }
    else setMsg({ kind: "err", text: res.status === 404 ? "Chức năng giả lập chỉ có ở môi trường phát triển" : "Giả lập thanh toán thất bại" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Ví Xu Xanh</h1>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {wallet && (
        <div className="rounded-2xl bg-emerald-800 p-6 text-white">
          <p className="text-sm text-emerald-100">Số dư</p>
          <p className="text-4xl font-bold">{wallet.balance.toLocaleString("vi-VN")} Xu</p>
          <p className="mt-1 text-sm text-emerald-100">Xu nạp {wallet.paid} · Xu thưởng {wallet.bonus} (tiêu trước) · 1 Xu = 1.000đ</p>
          {wallet.expiringSoon.length > 0 && <p className="mt-2 text-sm text-wood-200">{wallet.expiringSoon.reduce((s, x) => s + x.remaining, 0)} Xu thưởng sắp hết hạn</p>}
        </div>
      )}

      <Section title="Nạp Xu">
        <p className="mb-3 text-xs text-stone-500">Xu dùng để đẩy tin, mua Tin Ưu tiên, gói Nhà vườn. Xu không rút ra tiền mặt và không chuyển cho người khác.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pricing?.topUpPackages.map((p) => (
            <button key={p.code} onClick={() => start(p.code)} className={`rounded-xl border p-3 text-left ${p.popular ? "border-emerald-500 ring-1 ring-emerald-300" : "border-stone-200"}`}>
              <p className="font-semibold">{p.name}{p.popular && <span className="ml-2 rounded-full bg-wood-200 px-2 py-0.5 text-xs text-wood-800">Phổ biến</span>}</p>
              <p className="text-sm">{p.priceVnd.toLocaleString("vi-VN")}đ</p>
              <p className="text-xs text-emerald-700">{p.xu} Xu{p.bonusXu > 0 && ` + ${p.bonusXu} thưởng`}</p>
            </button>
          ))}
        </div>
        {topUp && (
          <div className="mt-4 space-y-2 rounded-xl bg-emerald-50 p-4 text-sm">
            <p className="font-semibold">Chuyển khoản để nạp {topUp.snapshot.xu} Xu</p>
            <p>Số tiền: <b>{topUp.snapshot.priceVnd.toLocaleString("vi-VN")}đ</b> · Chủ tài khoản: {topUp.bankAccountName}</p>
            <p>Nội dung chuyển khoản: <b className="select-all rounded bg-white px-2 py-0.5 font-mono">{topUp.transferContent}</b></p>
            <p className="text-xs text-stone-500">Xu được cộng tự động khi ngân hàng xác nhận. Lệnh hết hạn lúc {new Date(topUp.expiresAt).toLocaleTimeString("vi-VN")}.</p>
            <p className="text-xs text-stone-400">(Mã QR và cổng VNPay/MoMo sẽ hiển thị ở đây khi tích hợp cổng thanh toán thật.)</p>
            <button onClick={devPay} className={btn.secondary}>Giả lập đã thanh toán (môi trường dev)</button>
          </div>
        )}
      </Section>

      <Section title="Lịch sử">
        {ledger.length === 0 ? <p className="text-sm text-stone-500">Chưa có giao dịch.</p> : (
          <table className="w-full text-sm">
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id} className="border-t border-stone-100">
                  <td className="py-2 text-stone-500">{new Date(e.createdAt).toLocaleString("vi-VN")}</td>
                  <td>{TYPE[e.type] ?? e.type}</td><td className="text-stone-600">{e.note}</td>
                  <td className={`text-right font-medium ${e.amount > 0 ? "text-emerald-700" : "text-red-700"}`}>{e.amount > 0 ? "+" : ""}{e.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
