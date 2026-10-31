"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { vnd } from "@/lib/format";
import type { PlanPayment } from "@/lib/types";

/** Hiện mã VietQR của đơn PayOS ngay trên trang, tự kiểm tra trạng thái mỗi 3 giây; trả tiền xong chuyển sang trang kết quả. */
export function PayQr({ payment, onClose }: { payment: PlanPayment; onClose: () => void }) {
  const router = useRouter();
  const [svg, setSvg] = useState<string>();
  const [status, setStatus] = useState(payment.status);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!payment.qrCode) return;
    QRCode.toString(payment.qrCode, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f2e1b", light: "#ffffff" } })
      .then(setSvg, () => setError("Không vẽ được mã QR, hãy dùng trang thanh toán PayOS."));
  }, [payment.qrCode]);

  useEffect(() => {
    if (status !== "Pending") return;
    const t = setInterval(async () => {
      try {
        const p = await api<PlanPayment>(`plans/payments/${payment.id}`);
        setStatus(p.status);
        if (p.status === "Paid") router.push(`/goi/ket-qua?thanhToan=${payment.id}&ma=${payment.orderCode}`);
      } catch (e) { setError(errorText(e)); }
    }, 3000);
    return () => clearInterval(t);
  }, [status, payment.id, payment.orderCode, router]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="payqr-title" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <h2 id="payqr-title" className="cx-h2">Quét mã để thanh toán</h2>
        <p className="mt-1 text-[15px] text-stone-600">
          {payment.plan === "Pro" ? "Xanh Pro" : "Xanh Plus"} · {payment.months} tháng · <b className="text-emerald-900">{vnd(payment.amountVnd)}</b>
        </p>
        <div className="mx-auto mt-4 aspect-square w-60 rounded-2xl bg-white p-2 ring-1 ring-stone-200">
          {svg ? <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="cx-shimmer h-full w-full rounded-xl" />}
        </div>
        <p className="mt-3 text-sm text-stone-500">Mở app ngân hàng bất kỳ, chọn quét VietQR. Gói kích hoạt ngay khi tiền về.</p>
        <p className="mt-2 text-sm font-semibold text-wood-800">{status === "Pending" ? "Đang chờ thanh toán…" : status === "Paid" ? "Đã nhận tiền!" : "Đơn đã hết hạn hoặc bị hủy"}</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {payment.checkoutUrl && <a href={payment.checkoutUrl} className="rounded-full bg-emerald-800 py-3 font-semibold text-white hover:bg-emerald-700">Mở trang thanh toán PayOS</a>}
          <button type="button" onClick={onClose} className="rounded-full py-2 font-semibold text-stone-600 hover:text-stone-900">Đóng</button>
        </div>
      </div>
    </div>
  );
}
