"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/admin/components/StatusBadge";
import {
  api, formatDate, formatVnd, serviceName,
  type ApiError, type PriceBook, type ValidationResult,
} from "@/admin/lib/pricing";

type Tab = "services" | "garden" | "topup" | "escrow";
const TABS: { key: Tab; label: string }[] = [
  { key: "services", label: "Dịch vụ tin" },
  { key: "garden", label: "Gói Nhà vườn" },
  { key: "topup", label: "Nạp Xu" },
  { key: "escrow", label: "Phí đảm bảo" },
];

export default function PriceBookEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<PriceBook>();
  const [active, setActive] = useState<PriceBook>();
  const [tab, setTab] = useState<Tab>("services");
  const [validation, setValidation] = useState<ValidationResult>();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string }>();
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [ack, setAck] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchData = useCallback(
    () => Promise.all([api<PriceBook>(`admin/price-books/${id}`), api<PriceBook[]>("admin/price-books")]),
    [id],
  );
  const apply = ([b, all]: [PriceBook, PriceBook[]]) => {
    setBook(b);
    setActive(all.find((x) => x.status === "Active"));
    setDirty(false);
  };
  const onError = (e: unknown) => setMessage({ kind: "err", text: (e as ApiError).message });
  const load = () => fetchData().then(apply, onError);

  useEffect(() => {
    let cancelled = false;
    fetchData().then((r) => !cancelled && apply(r), (e) => !cancelled && onError(e));
    return () => { cancelled = true; };
  }, [fetchData]);

  if (!book) return <p className="text-stone-500">{message?.text ?? "Đang tải…"}</p>;

  const editable = book.status === "Draft" || book.status === "Rejected";
  const update = (fn: (b: PriceBook) => void) => {
    const next = structuredClone(book);
    fn(next);
    setBook(next);
    setDirty(true);
    setValidation(undefined);
  };

  async function run(action: () => Promise<unknown>, ok: string) {
    try {
      await action();
      setMessage({ kind: "ok", text: ok });
      await load();
    } catch (e) {
      const err = e as ApiError;
      if (err.details && typeof err.details === "object" && "errors" in err.details) setValidation(err.details as ValidationResult);
      setMessage({ kind: "err", text: err.message });
    }
  }

  const save = () => run(() => api(`admin/price-books/${id}`, { method: "PUT", body: JSON.stringify(book) }), "Đã lưu nháp");
  const validate = async () => {
    if (dirty) await save();
    await run(async () => setValidation(await api<ValidationResult>(`admin/price-books/${id}/validate`, { method: "POST" })), "Đã kiểm tra");
  };
  const submit = async () => {
    if (dirty) await save();
    await run(() => api(`admin/price-books/${id}/submit`, { method: "POST" }), "Đã gửi duyệt");
  };
  const approve = () => run(() => api(`admin/price-books/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null, warningsAcknowledged: ack }),
  }), "Đã duyệt");
  const reject = () => {
    const reason = prompt("Lý do từ chối");
    if (reason) run(() => api(`admin/price-books/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }), "Đã từ chối");
  };

  const oldServicePrice = (code: string, days: number | null | undefined, label: string | null | undefined, group: string) =>
    active?.listingServices.find((s) => s.code === code && (s.days ?? null) === (days ?? null) && (s.labelName ?? null) === (label ?? null))?.prices[group];

  return (
    <div className="max-w-6xl">
      <Link href="/quan-tri/pricing" className="text-sm text-stone-500 hover:text-emerald-700">← Bảng giá</Link>
      <div className="mb-4 mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Phiên bản v{book.version}</h1>
        <StatusBadge status={book.status} />
        <span className="text-sm text-stone-500">soạn bởi {book.createdBy} · hiệu lực từ {formatDate(book.effectiveFrom)}</span>
      </div>

      {message && (
        <p className={`mb-4 rounded p-3 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}
      {book.rejectReason && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">Bị từ chối: {book.rejectReason}</p>}

      <div className="mb-4 flex gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm ${tab === t.key ? "border-b-2 border-emerald-600 font-medium text-emerald-700" : "text-stone-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        {tab === "services" && (
          <table className="w-full text-sm">
            <thead className="text-left text-stone-500">
              <tr>
                <th className="py-2">Dịch vụ</th><th>Bật</th>
                {book.priceGroups.map((g) => <th key={g.code}>{g.name} (Xu)</th>)}
              </tr>
            </thead>
            <tbody>
              {book.listingServices.map((s, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="py-2">{serviceName(s)}</td>
                  <td>
                    <input type="checkbox" disabled={!editable} checked={s.enabled}
                      onChange={(e) => update((b) => { b.listingServices[i].enabled = e.target.checked; })} />
                  </td>
                  {book.priceGroups.map((g) => {
                    const old = oldServicePrice(s.code, s.days, s.labelName, g.code);
                    const changed = active && book.id !== active.id && old !== undefined && old !== s.prices[g.code];
                    return (
                      <td key={g.code}>
                        <input type="number" min={0} disabled={!editable} value={s.prices[g.code] ?? 0}
                          title={changed ? `Bản hiệu lực: ${old}` : undefined}
                          className={`w-24 rounded border px-2 py-1 ${changed ? "border-amber-400 bg-amber-50" : "border-stone-300"}`}
                          onChange={(e) => update((b) => { b.listingServices[i].prices[g.code] = Number(e.target.value); })} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "garden" && (
          <table className="w-full text-sm">
            <thead className="text-left text-stone-500"><tr><th className="py-2">Kỳ hạn</th><th>Giá (VNĐ)</th><th>Tương đương/tháng</th><th>Bật</th></tr></thead>
            <tbody>
              {book.gardenPlans.map((p, i) => (
                <tr key={p.months} className="border-t border-stone-100">
                  <td className="py-2">{p.months} tháng</td>
                  <td><input type="number" min={0} disabled={!editable} value={p.priceVnd} className="w-32 rounded border border-stone-300 px-2 py-1"
                    onChange={(e) => update((b) => { b.gardenPlans[i].priceVnd = Number(e.target.value); })} /></td>
                  <td>{formatVnd(Math.round(p.priceVnd / p.months))}</td>
                  <td><input type="checkbox" disabled={!editable} checked={p.enabled}
                    onChange={(e) => update((b) => { b.gardenPlans[i].enabled = e.target.checked; })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "topup" && (
          <>
            <p className="mb-3 text-xs text-stone-500">Tỉ giá 1 Xu = 1.000đ được khóa, không chỉnh được (tài liệu 08 §1).</p>
            <table className="w-full text-sm">
              <thead className="text-left text-stone-500"><tr><th className="py-2">Gói</th><th>Giá (VNĐ)</th><th>Xu nạp</th><th>Xu thưởng</th><th>Hạn Xu thưởng (ngày)</th><th>Bật</th></tr></thead>
              <tbody>
                {book.topUpPackages.map((p, i) => (
                  <tr key={p.code} className="border-t border-stone-100">
                    <td className="py-2">{p.name}{p.popular && " ⭐"}</td>
                    {(["priceVnd", "xu", "bonusXu", "bonusExpiryDays"] as const).map((f) => (
                      <td key={f}><input type="number" min={0} disabled={!editable} value={p[f]} className="w-28 rounded border border-stone-300 px-2 py-1"
                        onChange={(e) => update((b) => { b.topUpPackages[i][f] = Number(e.target.value); })} /></td>
                    ))}
                    <td><input type="checkbox" disabled={!editable} checked={p.enabled}
                      onChange={(e) => update((b) => { b.topUpPackages[i].enabled = e.target.checked; })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === "escrow" && (
          <div className="grid max-w-xl grid-cols-2 gap-4 text-sm">
            {([
              ["pct", "Phí (%)"], ["minVnd", "Phí tối thiểu (VNĐ)"], ["maxVnd", "Phí tối đa (VNĐ)"],
              ["orderMinVnd", "Giá trị đơn tối thiểu (VNĐ)"], ["orderMaxVnd", "Giá trị đơn tối đa (VNĐ)"],
            ] as const).map(([f, label]) => (
              <label key={f} className="block">
                {label}
                <input type="number" min={0} step={f === "pct" ? 0.1 : 1000} disabled={!editable} value={book.escrowFee[f]}
                  className="mt-1 w-full rounded border border-stone-300 px-2 py-1"
                  onChange={(e) => update((b) => { b.escrowFee[f] = Number(e.target.value); })} />
              </label>
            ))}
            <label className="block">
              Bên trả phí
              <select disabled={!editable} value={book.escrowFee.payer} className="mt-1 w-full rounded border border-stone-300 px-2 py-1"
                onChange={(e) => update((b) => { b.escrowFee.payer = e.target.value; })}>
                <option value="SELLER">Người bán</option><option value="BUYER">Người mua</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {editable && (
        <label className="mt-4 block text-sm">
          Ghi chú thay đổi
          <input className="mt-1 w-full rounded border border-stone-300 px-2 py-1" value={book.changeNote ?? ""}
            onChange={(e) => update((b) => { b.changeNote = e.target.value; })} />
        </label>
      )}

      {validation && (
        <div className="mt-4 space-y-1 text-sm">
          <p className="font-medium">{validation.errors.length} lỗi · {validation.warnings.length} cảnh báo</p>
          {validation.errors.map((e, i) => <p key={`e${i}`} className="text-red-700">✖ {e.message}</p>)}
          {validation.warnings.map((w, i) => <p key={`w${i}`} className="text-amber-700">⚠ {w.message}</p>)}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {editable && (
          <>
            <button onClick={save} disabled={!dirty} className="rounded border border-stone-300 px-4 py-2 text-sm disabled:opacity-40">Lưu nháp</button>
            <button onClick={validate} className="rounded border border-stone-300 px-4 py-2 text-sm">Kiểm tra</button>
            <button onClick={submit} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Gửi duyệt</button>
          </>
        )}
        {book.status === "PendingApproval" && (
          <>
            <label className="text-sm">Hiệu lực lúc
              <input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                className="ml-2 rounded border border-stone-300 px-2 py-1" />
              <span className="ml-1 text-xs text-stone-400">(bỏ trống = ngay)</span>
            </label>
            <label className="text-sm"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mr-1" />Đã xem cảnh báo</label>
            <button onClick={approve} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Duyệt</button>
            <button onClick={reject} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700">Từ chối</button>
          </>
        )}
      </div>
    </div>
  );
}
