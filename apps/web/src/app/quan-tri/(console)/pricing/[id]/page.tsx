"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/admin/components/StatusBadge";
import {
  api, formatDate,
  type ApiError, type PriceBook, type ValidationResult,
} from "@/admin/lib/pricing";

export default function PriceBookEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<PriceBook>();
  const [active, setActive] = useState<PriceBook>();
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

      <div className="rounded-2xl border border-stone-300 bg-white p-4">
        {(
          <>
            <h2 className="mb-1 font-semibold">Gói nạp Xu</h2>
            <p className="mb-3 text-xs text-stone-500">Phí đăng tin và giá gói Plus/Pro cấu hình trong mã (PlanModels). Tỉ giá 1 Xu = 1.000đ được khóa, không chỉnh được (tài liệu 08 §1).</p>
            <div className="overflow-x-auto"><table className="w-full text-sm">
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
            </table></div>
          </>
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
            <button onClick={submit} className="inline-block rounded-full bg-wood-400 px-4 py-2 text-sm font-bold text-stone-900 hover:brightness-95 disabled:opacity-40">Gửi duyệt</button>
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
