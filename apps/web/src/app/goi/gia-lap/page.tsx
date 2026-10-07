"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { vnd } from "@/lib/format";
import type { PlanPayment } from "@/lib/types";

export default function SimulatedCheckoutPage() {
  return <Suspense><SimulatedCheckout /></Suspense>;
}

/** Thay trang PayOS khi máy chủ chưa có khóa PayOS (chỉ bật lúc phát triển/demo). Không có tiền thật. */
function SimulatedCheckout() {
  const router = useRouter();
  const order = useSearchParams().get("ma");
  const [payment, setPayment] = useState<PlanPayment>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (order) api<PlanPayment>(`plans/payments/order/${order}`).then(setPayment, (e) => setError(errorText(e)));
  }, [order]);

  async function pay() {
    if (!payment) return;
    setBusy(true);
    try {
      await api(`plans/payments/${payment.id}/simulate`, { method: "POST" });
      router.replace(`/goi/ket-qua?thanhToan=${payment.id}`);
    } catch (e) { setError(errorText(e)); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="rounded-2xl bg-wood-100 px-4 py-3 text-sm text-wood-800 ring-1 ring-wood-200">
        <b>Thanh toán giả lập.</b> Máy chủ chưa cấu hình PayOS nên trang này thay cho trang quét mã. Không có tiền thật được chuyển.
      </p>
      <div className="rounded-3xl bg-white p-7 text-center ring-1 ring-stone-200">
        {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
        {!payment && !error && <div className="cx-shimmer h-60 rounded-2xl" />}
        {payment && (
          <>
            <p className="text-stone-500">Thanh toán gói</p>
            <h1 className="text-3xl font-extrabold text-emerald-900">{payment.plan === "Pro" ? "Xanh Pro" : "Xanh Plus"} · {payment.months} tháng</h1>
            <p className="mt-2 font-display text-4xl font-extrabold">{vnd(payment.amountVnd)}</p>
            <div aria-hidden className="mx-auto my-6 grid h-44 w-44 grid-cols-7 gap-1 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
              {Array.from({ length: 49 }, (_, i) => <span key={i} className={(i * 7 + payment.orderCode) % 3 === 0 ? "rounded-sm bg-stone-900" : ""} />)}
            </div>
            <p className="text-sm text-stone-500">Mã đơn {payment.orderCode}</p>
            {payment.status === "Pending" ? (
              <div className="mt-6 flex flex-col gap-2">
                <button type="button" onClick={pay} disabled={busy} className="cx-press rounded-full bg-emerald-800 py-3 font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300">
                  {busy ? "Đang xác nhận…" : "Xác nhận đã chuyển khoản (giả lập)"}
                </button>
                <button type="button" onClick={() => router.replace(`/goi/ket-qua?thanhToan=${payment.id}&huy=1`)} className="py-2 font-semibold text-stone-600 hover:text-red-700">Hủy</button>
              </div>
            ) : (
              <button type="button" onClick={() => router.replace(`/goi/ket-qua?thanhToan=${payment.id}`)} className="mt-6 font-semibold text-emerald-800 underline">Xem kết quả</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
