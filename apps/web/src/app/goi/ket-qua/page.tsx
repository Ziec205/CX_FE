"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { vnd } from "@/lib/format";
import { vnDate } from "@/lib/plans";
import type { PlanPayment } from "@/lib/types";

export default function PaymentResultPage() {
  return <Suspense><PaymentResult /></Suspense>;
}

/** PayOS đưa người dùng về đây sau khi thanh toán (hoặc bấm hủy). Hỏi BE vài lần vì tiền có thể về chậm vài giây. */
function PaymentResult() {
  const params = useSearchParams();
  const id = params.get("thanhToan");
  const cancelled = params.get("huy") === "1" || params.get("cancel") === "true";
  const [payment, setPayment] = useState<PlanPayment>();
  const [error, setError] = useState<string>();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!id) return;
    let stop = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const p = cancelled
          ? await api<PlanPayment>(`plans/payments/${id}/cancel`, { method: "POST" })
          : await api<PlanPayment>(`plans/payments/${id}`);
        if (stop) return;
        setPayment(p);
        if (p.status === "Pending" && !cancelled) {
          if (++tries < 40) timer = setTimeout(poll, 3000);
          else setGaveUp(true);
        }
      } catch (e) { if (!stop) setError(errorText(e)); }
    };
    poll();
    return () => { stop = true; clearTimeout(timer); };
  }, [id, cancelled]);

  if (!id) return <Message tone="err" title="Thiếu mã thanh toán">Hãy mở lại từ trang <Link href="/goi" className="font-semibold underline">Gói</Link>.</Message>;
  if (error) return <Message tone="err" title="Không xem được đơn thanh toán">{error}</Message>;
  if (!payment) return <div className="mx-auto max-w-lg"><div className="cx-shimmer h-56 rounded-3xl" /></div>;

  const name = payment.plan === "Pro" ? "Xanh Pro" : "Xanh Plus";
  if (payment.status === "Paid")
    return (
      <Message tone="ok" title={`Đã kích hoạt ${payment.appliedPlan === "Pro" ? "Xanh Pro" : name}!`}>
        <p>Cảm ơn bạn đã thanh toán {vnd(payment.amountVnd)}. Gói có hiệu lực đến <b>{vnDate(payment.appliedEndAt)}</b>.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/vuon-cua-toi" className="rounded-full bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">Mở Hồ sơ vườn</Link>
          <Link href="/tro-ly-ai" className="rounded-full bg-white px-5 py-2.5 font-semibold text-emerald-900 ring-1 ring-stone-300 hover:ring-emerald-700">Hỏi Trợ lý AI</Link>
        </div>
      </Message>
    );
  if (payment.status === "Pending")
    return (
      <Message tone="wait" title={gaveUp ? "Chưa nhận được tiền" : "Đang chờ xác nhận thanh toán…"}>
        <p>{gaveUp ? "Nếu bạn đã chuyển khoản, gói sẽ tự kích hoạt khi tiền về và bạn sẽ nhận được thông báo." : `Đơn ${name} ${payment.months} tháng · ${vnd(payment.amountVnd)}. Trang tự cập nhật, bạn không cần tải lại.`}</p>
        {payment.checkoutUrl && new Date(payment.expiresAt) > new Date() && (
          <a href={payment.checkoutUrl} className="mt-4 inline-block font-semibold text-emerald-800 underline">Quay lại trang thanh toán</a>
        )}
      </Message>
    );
  return (
    <Message tone="err" title={payment.status === "Cancelled" ? "Đã hủy thanh toán" : "Link thanh toán đã hết hạn"}>
      <p>Bạn chưa bị trừ tiền. Có thể chọn lại gói bất kỳ lúc nào.</p>
      <Link href="/goi" className="mt-4 inline-block rounded-full bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">Xem các gói</Link>
    </Message>
  );
}

function Message({ tone, title, children }: { tone: "ok" | "wait" | "err"; title: string; children: React.ReactNode }) {
  const color = { ok: "bg-emerald-50 ring-emerald-200", wait: "bg-wood-100 ring-wood-200", err: "bg-white ring-stone-200" }[tone];
  return (
    <div className={`mx-auto max-w-lg rounded-3xl p-8 text-center ring-1 ${color}`}>
      <h1 className="text-3xl font-extrabold text-emerald-900">{title}</h1>
      <div className="mt-3 text-[15px] text-stone-700">{children}</div>
    </div>
  );
}
