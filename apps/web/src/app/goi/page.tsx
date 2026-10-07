"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMyPlan } from "@/components/PlanGate";
import { api, errorText, type ApiError } from "@/lib/api";
import { vnd } from "@/lib/format";
import { vnDate } from "@/lib/plans";
import type { PlanCode, PlanInfo, PlanPayment } from "@/lib/types";

const STATUS: Record<PlanPayment["status"], string> = { Pending: "Chờ thanh toán", Paid: "Đã thanh toán", Cancelled: "Đã hủy", Expired: "Hết hạn" };

function features(p: PlanInfo): [string, boolean][] {
  return [
    [`Hồ sơ vườn: ${p.gardenPlants} cây`, true],
    [`${p.aiPerDay} lượt Trợ lý AI mỗi ngày`, true],
    ["Hỏi đáp, chẩn đoán bệnh cây qua ảnh", true],
    ["Nhắc lịch tưới, bón phân", true],
    ["AI so sánh cây trong chợ", p.marketCompare],
    ["AI viết tin từ ảnh, gợi ý giá, so tin với chợ", p.sellerAi],
  ];
}

export default function PlansPage() {
  return <Suspense><Plans /></Suspense>;
}

function Plans() {
  const highlight = useSearchParams().get("chon") as PlanCode | null;
  const [plans, setPlans] = useState<PlanInfo[]>();
  const [months, setMonths] = useState<1 | 12>(1);
  const [mine] = useMyPlan();
  const [history, setHistory] = useState<PlanPayment[]>();
  const [busy, setBusy] = useState<PlanCode>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    api<{ plans: PlanInfo[] }>("plans").then((r) => setPlans(r.plans), (e) => setError(errorText(e)));
  }, []);
  useEffect(() => {
    if (mine) api<PlanPayment[]>("me/plan/payments").then(setHistory, () => {});
  }, [mine]);

  async function buy(code: PlanCode) {
    setBusy(code); setError(undefined);
    try {
      const pay = await api<PlanPayment>("plans/checkout", { method: "POST", json: { plan: code, months } });
      if (pay.checkoutUrl) window.location.assign(pay.checkoutUrl);
    } catch (e) {
      setError((e as ApiError).status === 401 ? "Vui lòng đăng nhập để mua gói." : errorText(e));
      setBusy(undefined);
    }
  }

  const current = mine?.plan.code ?? "Free";
  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold text-emerald-900 sm:text-5xl">Chọn gói cho khu vườn của bạn</h1>
        <p className="mt-3 text-lg text-stone-600">Lưu thêm cây trong Hồ sơ vườn, hỏi Trợ lý AI nhiều hơn, và để AI giúp bạn mua bán cây.</p>
        {mine && mine.plan.code !== "Free" && (
          <p className="mx-auto mt-4 w-fit rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-900 ring-1 ring-emerald-200">
            Bạn đang dùng {mine.plan.name} đến {vnDate(mine.endAt)}
          </p>
        )}
        <div role="radiogroup" aria-label="Kỳ hạn" className="mx-auto mt-6 inline-flex rounded-full bg-white p-1 ring-1 ring-stone-300">
          {([[1, "Theo tháng"], [12, "Theo năm"]] as const).map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={months === m} onClick={() => setMonths(m)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-semibold sm:px-5 ${months === m ? "bg-emerald-800 text-white" : "text-stone-700 hover:text-emerald-800"}`}>
              {label}{m === 12 && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${months === m ? "bg-wood-400 text-stone-900" : "bg-wood-100 text-wood-800"}`}>tặng 2 tháng</span>}
            </button>
          ))}
        </div>
      </header>

      {error && <p role="alert" className="mx-auto max-w-3xl rounded-2xl bg-red-50 px-4 py-3 text-center text-red-800">{error}{error.includes("đăng nhập") && <> <Link href="/dang-nhap?next=/goi" className="font-semibold underline">Đăng nhập</Link></>}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        {!plans && [0, 1, 2].map((i) => <div key={i} className="cx-shimmer h-[30rem] rounded-3xl" />)}
        {plans?.map((p) => {
          const pro = p.code === "Pro";
          const price = months === 12 ? p.yearlyVnd : p.monthlyVnd;
          const isCurrent = current === p.code;
          const lower = current === "Pro" && p.code === "Plus";
          return (
            <article key={p.code}
              className={`relative flex flex-col rounded-3xl p-6 sm:p-7 ${pro ? "bg-emerald-900 text-white shadow-xl" : "bg-white ring-1 ring-stone-200"} ${highlight === p.code ? "ring-4 ring-wood-400" : ""}`}>
              {pro && <span className="absolute -top-3 left-6 rounded-full bg-wood-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-900">Cho nhà vườn chuyên nghiệp</span>}
              <h2 className={`text-2xl font-bold ${pro ? "text-white" : "text-emerald-900"}`}>{p.name}</h2>
              <p className={`mt-1 min-h-12 ${pro ? "text-emerald-100" : "text-stone-600"}`}>{p.tagline}</p>
              <p className="mt-4">
                <span className="font-display text-4xl font-extrabold">{price === 0 ? "0 đ" : vnd(price)}</span>
                {price > 0 && <span className={pro ? "text-emerald-200" : "text-stone-500"}> / {months === 12 ? "năm" : "tháng"}</span>}
              </p>
              {months === 12 && price > 0 && <p className={`text-sm ${pro ? "text-emerald-200" : "text-stone-500"}`}>Chỉ {vnd(Math.round(price / 12 / 100) * 100)}/tháng</p>}
              <ul className="mt-6 flex-1 space-y-2.5">
                {features(p).map(([f, on]) => (
                  <li key={f} className={`flex gap-2.5 ${on ? "" : pro ? "text-emerald-300/60 line-through" : "text-stone-400 line-through"}`}>
                    <svg viewBox="0 0 24 24" className={`mt-0.5 h-5 w-5 shrink-0 ${on ? (pro ? "text-wood-400" : "text-emerald-600") : "opacity-40"}`} fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      {on ? <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />}
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                {p.code === "Free" ? (
                  <p className={`rounded-full py-3 text-center font-semibold ${isCurrent ? "bg-stone-100 text-stone-700" : "text-stone-500"}`}>{isCurrent ? "Gói hiện tại" : "Luôn miễn phí"}</p>
                ) : mine === null ? (
                  <Link href={`/dang-nhap?next=${encodeURIComponent(`/goi?chon=${p.code}`)}`}
                    className={`block rounded-full py-3 text-center font-semibold ${pro ? "bg-wood-400 text-stone-900 hover:bg-wood-200" : "bg-emerald-800 text-white hover:bg-emerald-700"}`}>Đăng nhập để mua</Link>
                ) : (
                  <button type="button" onClick={() => buy(p.code)} disabled={!!busy || lower || mine === undefined}
                    className={`cx-press w-full rounded-full py-3 font-semibold disabled:opacity-50 ${pro ? "bg-wood-400 text-stone-900 hover:bg-wood-200" : "bg-emerald-800 text-white hover:bg-emerald-700"}`}>
                    {busy === p.code ? "Đang mở trang thanh toán…" : lower ? "Đang dùng gói cao hơn" : isCurrent ? `Gia hạn ${months === 12 ? "12 tháng" : "1 tháng"}`
                      : current === "Plus" && pro ? "Nâng lên Xanh Pro" : `Mua ${p.name}`}
                  </button>
                )}
                {current === "Plus" && pro && <p className="mt-2 text-center text-xs text-emerald-200">Số ngày Xanh Plus còn lại được quy đổi sang ngày Xanh Pro theo tỉ lệ giá.</p>}
              </div>
            </article>
          );
        })}
      </div>

      <section className="grid gap-4 rounded-3xl bg-white p-6 text-[15px] ring-1 ring-stone-200 sm:grid-cols-3 sm:p-7">
        <div>
          <h3 className="font-sans text-base font-bold tracking-normal text-emerald-900">Thanh toán qua PayOS</h3>
          <p className="mt-1 text-stone-600">Quét mã VietQR bằng app ngân hàng bất kỳ. Gói kích hoạt ngay khi tiền về, không cần chờ duyệt.</p>
        </div>
        <div>
          <h3 className="font-sans text-base font-bold tracking-normal text-emerald-900">Không tự động trừ tiền</h3>
          <p className="mt-1 text-stone-600">Gói không tự gia hạn. Chúng tôi nhắc bạn trước 3 ngày; gia hạn sớm thì thời hạn được cộng nối.</p>
        </div>
        <div>
          <h3 className="font-sans text-base font-bold tracking-normal text-emerald-900">Hết hạn thì sao?</h3>
          <p className="mt-1 text-stone-600">Bạn về gói Miễn phí. Hồ sơ vườn giữ 3 cây mới nhất; các cây khác tạm khóa và tắt nhắc lịch cho đến khi gia hạn, không bị xóa.</p>
        </div>
      </section>

      {history && history.length > 0 && (
        <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:p-7">
          <h2 className="mb-3 text-2xl font-bold text-emerald-900">Lịch sử thanh toán</h2>
          <ul className="divide-y divide-stone-100">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[15px]">
                <span><b>{h.plan === "Pro" ? "Xanh Pro" : "Xanh Plus"}</b> · {h.months} tháng · {vnd(h.amountVnd)}</span>
                <span className="flex items-center gap-3 text-sm text-stone-500">
                  {new Date(h.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold ${h.status === "Paid" ? "bg-emerald-50 text-emerald-800" : h.status === "Pending" ? "bg-wood-100 text-wood-800" : "bg-stone-100 text-stone-600"}`}>{STATUS[h.status]}</span>
                  {h.status === "Pending" && h.checkoutUrl && new Date(h.expiresAt) > new Date() && <a href={h.checkoutUrl} className="font-semibold text-emerald-800 underline">Thanh toán tiếp</a>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
