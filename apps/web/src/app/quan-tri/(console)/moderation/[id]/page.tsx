"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Alert, Card, Pill, btn, input } from "@/admin/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/admin/lib/api";

interface CaseDetail {
  case: { id: string; trigger: string; queue: string; riskScore: number; signals: string[]; sellerId: string; slaDueAt: string };
  listing: {
    id: string; title: string; description: string; status: string; type: string; categoryId: string; speciesId?: string;
    price?: number; priceMode: string; priceRefMin?: number; priceRefMax?: number; attributes: Record<string, unknown>;
    media: { mediaId: string; capturedInApp: boolean }[]; verificationMediaId?: string; provinceId: string;
    pendingRevision?: { title: string; description: string; price?: number; media: { mediaId: string }[] } | null;
  };
  sellerHistory: { id: string; decision: string; reasonCode?: string; decidedAt: string; trigger: string }[];
  reports: { id: string; reason: string; note?: string; weight: number; createdAt: string }[];
  sellerActivePoints: number;
}
interface Reason { code: string; label: string; points: number }

const DECISIONS: Record<string, { value: string; label: string }[]> = {
  New: [{ value: "Approve", label: "Duyệt" }, { value: "RequestChanges", label: "Yêu cầu sửa" }, { value: "Reject", label: "Từ chối" }],
  Edit: [{ value: "Approve", label: "Duyệt bản sửa" }, { value: "RequestChanges", label: "Yêu cầu sửa" }, { value: "Reject", label: "Từ chối bản sửa" }],
  Report: [{ value: "Dismiss", label: "Bác báo cáo (khôi phục tin)" }, { value: "Remove", label: "Gỡ tin" }],
  RandomAudit: [{ value: "Approve", label: "Đạt" }, { value: "Remove", label: "Gỡ tin" }],
  Appeal: [{ value: "Approve", label: "Chấp nhận khiếu nại" }, { value: "Reject", label: "Giữ nguyên quyết định" }],
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CaseDetail>();
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [decision, setDecision] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<CaseDetail>(`admin/moderation/cases/${id}`), api<Reason[]>("admin/moderation/reasons")])
      .then(([d, r]) => { if (!cancelled) { setData(d); setReasons(r); setDecision(DECISIONS[d.case.trigger]?.[0]?.value ?? ""); } })
      .catch((e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [id]);

  if (!data) return error ? <Alert>{error}</Alert> : <p className="text-stone-500">Đang tải…</p>;
  const { case: c, listing: l } = data;
  const needsReason = ["Reject", "Remove", "RequestChanges"].includes(decision);
  const selectedReason = reasons.find((r) => r.code === reasonCode);

  async function decide() {
    setBusy(true);
    setError(undefined);
    try {
      await api(`admin/moderation/cases/${id}/decide`, { method: "POST", json: { decision, reasonCode: reasonCode || null, note: note || null } });
      router.push("/quan-tri/moderation");
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const photos = (l.pendingRevision && c.trigger === "Edit" ? l.pendingRevision.media : l.media).map((m) => m.mediaId);
  return (
    <div className="max-w-6xl">
      <Link href="/quan-tri/moderation" className="text-sm text-stone-500 hover:text-emerald-700">← Hàng chờ</Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{c.trigger === "Edit" && l.pendingRevision ? l.pendingRevision.title : l.title}</h1>
        <Pill value={c.queue} /><Pill value={l.status} />
        <span className="text-sm text-stone-500">Rủi ro {c.riskScore} · hạn {formatDate(c.slaDueAt)}</span>
      </div>
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={c.trigger === "Edit" ? "Bản sửa chờ duyệt" : "Nội dung tin"}>
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m} src={`/media/${m}/card.webp`} alt="" className="aspect-square w-full rounded object-cover" />
              ))}
            </div>
            <p className="whitespace-pre-line text-sm">{c.trigger === "Edit" && l.pendingRevision ? l.pendingRevision.description : l.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-stone-500">Loại tin / danh mục</dt><dd>{l.type} · {l.categoryId}</dd>
              <dt className="text-stone-500">Loài</dt><dd>{l.speciesId ?? "—"}</dd>
              <dt className="text-stone-500">Giá</dt>
              <dd>{l.priceMode === "Negotiable" ? `Thỏa thuận (${formatVnd(l.priceRefMin)} – ${formatVnd(l.priceRefMax)})` : formatVnd(l.pendingRevision?.price ?? l.price)}</dd>
              {Object.entries(l.attributes).map(([k, v]) => (
                <Fragment key={k}><dt className="text-stone-500">{k}</dt><dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd></Fragment>
              ))}
            </dl>
            {l.verificationMediaId && (
              <div className="mt-3 text-sm">
                <p className="mb-1 text-stone-500">Ảnh xác minh (tin giá trị cao)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${l.verificationMediaId}/card.webp`} alt="" className="h-40 rounded" />
              </div>
            )}
          </Card>
          {data.reports.length > 0 && (
            <Card title={`Báo cáo (${data.reports.length})`}>
              <ul className="space-y-1 text-sm">
                {data.reports.map((r) => <li key={r.id}>{r.reason} · trọng số {r.weight} · {formatDate(r.createdAt)}{r.note && ` — ${r.note}`}</li>)}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Tín hiệu rủi ro">
            <ul className="space-y-1 text-sm">{c.signals.map((s) => <li key={s} className="rounded bg-stone-50 px-2 py-1 font-mono text-xs">{s}</li>)}</ul>
          </Card>
          <Card title="Người bán">
            <p className="text-sm">Điểm vi phạm còn hiệu lực: <b className={data.sellerActivePoints >= 6 ? "text-red-700" : ""}>{data.sellerActivePoints}</b></p>
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              {data.sellerHistory.slice(0, 8).map((h) => <li key={h.id}>{formatDate(h.decidedAt)} · {h.trigger} → {h.decision}{h.reasonCode && ` (${h.reasonCode})`}</li>)}
            </ul>
          </Card>
          <Card title="Quyết định">
            <div className="space-y-3 text-sm">
              <select value={decision} onChange={(e) => setDecision(e.target.value)} className={`${input} w-full`}>
                {(DECISIONS[c.trigger] ?? []).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              {needsReason && (
                <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className={`${input} w-full`}>
                  <option value="">— Chọn lý do chuẩn —</option>
                  {reasons.map((r) => <option key={r.code} value={r.code}>{r.label}{r.points > 0 ? ` (+${r.points} điểm)` : ""}</option>)}
                </select>
              )}
              {selectedReason && selectedReason.points > 0 && decision !== "RequestChanges" && (
                <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Người bán sẽ bị cộng {selectedReason.points} điểm vi phạm (≥6: hạn chế đăng 7 ngày, ≥10: khóa 30 ngày).</p>
              )}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú cho người bán (tùy chọn)" rows={3} className={`${input} w-full`} />
              <button onClick={decide} disabled={busy || (needsReason && !reasonCode)} className={`${decision === "Approve" || decision === "Dismiss" ? btn.primary : btn.danger} w-full`}>
                {busy ? "Đang xử lý…" : "Xác nhận"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
