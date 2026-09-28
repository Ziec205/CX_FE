"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/admin/components/AdminContext";
import { Alert, Card, PageTitle, btn, input } from "@/admin/components/ui";
import { api, errorText, formatDate, formatVnd } from "@/admin/lib/api";
import { DISPUTE_REASON, ORDER_LABEL } from "@/admin/lib/escrow";

interface Order {
  id: string; code: string; listingId: string; listingTitle: string; buyerId: string; sellerId: string; status: string;
  quantity: number; unitPrice: number; itemAmount: number; shippingFee: number; total: number; fee: number; refundAmount: number;
  delivery: string; deliveryAddress?: string | null; settlementHold: boolean; payoutAmount?: number | null; payoutEligibleAt?: string | null;
  shipment?: { carrier?: string; trackingCode?: string; mediaIds: string[] } | null; deliveryProofMediaIds: string[];
  dispute?: {
    reason: string; description: string; mediaIds: string[]; hasUnboxingVideo: boolean; openedAt: string; sellerDueAt: string;
    sellerResponse?: string | null; sellerOfferAmount?: number | null; sellerNote?: string | null; sellerMediaIds: string[];
    outcome?: string | null; resolutionNote?: string | null; resolvedRefund?: number | null;
  } | null;
  history: { status: string; actorId: string; note?: string | null; at: string }[];
}

function Evidence({ ids, secure }: { ids: string[]; secure?: boolean }) {
  if (!ids.length) return <span className="text-stone-400">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const src = secure ? `/api/admin-proxy/secure-media/${id}/thumb` : `/media/${id}/thumb.webp`;
        const full = secure ? `/api/admin-proxy/secure-media/${id}/full` : `/media/${id}/full.webp`;
        return (
          <a key={id} href={full} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-20 w-20 rounded object-cover ring-1 ring-stone-200" />
          </a>
        );
      })}
    </div>
  );
}

export default function EscrowDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const [o, setO] = useState<Order>();
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [outcome, setOutcome] = useState("PartialRefund");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  const load = useCallback(() => { api<{ order: Order }>(`admin/escrow/orders/${id}`).then((r) => setO(r.order), (e) => setError(errorText(e))); }, [id]);
  useEffect(load, [load]);

  async function resolve() {
    setError(undefined);
    if (!confirm("Xác nhận phân xử? Thao tác chuyển tiền không hoàn tác được.")) return;
    try {
      await api(`admin/escrow/orders/${id}/resolve`, { method: "POST", json: { outcome, refundAmount: outcome === "PartialRefund" ? amount : null, note } });
      setOk("Đã phân xử"); load();
    } catch (e) { setError(errorText(e)); }
  }
  async function hold(on: boolean) {
    try { await api(`admin/escrow/orders/${id}/hold?hold=${on}`, { method: "POST" }); load(); } catch (e) { setError(errorText(e)); }
  }

  if (!o) return error ? <Alert>{error}</Alert> : <p className="text-sm text-stone-500">Đang tải…</p>;
  const d = o.dispute;
  return (
    <div className="max-w-6xl space-y-4">
      <PageTitle title={`Đơn ${o.code}`} subtitle={ORDER_LABEL[o.status] ?? o.status} action={<Link href="/quan-tri/escrow" className={btn.secondary}>← Danh sách</Link>} />
      {error && <Alert>{error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Đơn hàng">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-stone-500">Tin</dt><dd>{o.listingTitle}</dd>
            <dt className="text-stone-500">Người mua</dt><dd className="font-mono text-xs"><Link href={`/quan-tri/members/${o.buyerId}`} className="text-emerald-700">{o.buyerId}</Link></dd>
            <dt className="text-stone-500">Người bán</dt><dd className="font-mono text-xs"><Link href={`/quan-tri/members/${o.sellerId}`} className="text-emerald-700">{o.sellerId}</Link></dd>
            <dt className="text-stone-500">Số lượng</dt><dd>{o.quantity} × {formatVnd(o.unitPrice)}</dd>
            <dt className="text-stone-500">Tiền cây + ship</dt><dd>{formatVnd(o.itemAmount)} + {formatVnd(o.shippingFee)}</dd>
            <dt className="text-stone-500">Tổng / Phí</dt><dd>{formatVnd(o.total)} / {formatVnd(o.fee)}</dd>
            <dt className="text-stone-500">Đã hoàn</dt><dd>{formatVnd(o.refundAmount)}</dd>
            <dt className="text-stone-500">Chi người bán</dt><dd>{formatVnd(o.payoutAmount)} {o.payoutEligibleAt && `(từ ${formatDate(o.payoutEligibleAt)})`}</dd>
            <dt className="text-stone-500">Giao nhận</dt><dd>{o.delivery}{o.shipment?.trackingCode && ` · ${o.shipment.carrier} ${o.shipment.trackingCode}`}</dd>
          </dl>
          <div className="mt-3 text-sm">
            <p className="mb-1 text-stone-500">Ảnh gửi / giao hàng</p>
            <Evidence ids={[...(o.shipment?.mediaIds ?? []), ...o.deliveryProofMediaIds]} />
          </div>
          {can("dispute.resolve") && (
            <div className="mt-3">
              {o.settlementHold
                ? <button onClick={() => hold(false)} className={btn.secondary}>Bỏ tạm dừng quyết toán</button>
                : <button onClick={() => hold(true)} className={btn.danger}>Tạm dừng quyết toán</button>}
            </div>
          )}
        </Card>
        <Card title="Lịch sử">
          <ol className="space-y-1 text-sm">
            {o.history.map((h, i) => (
              <li key={i}><b>{ORDER_LABEL[h.status] ?? h.status}</b> <span className="text-stone-500">{formatDate(h.at)} · {h.actorId}</span>{h.note && <span className="block text-stone-600">{h.note}</span>}</li>
            ))}
          </ol>
        </Card>
      </div>

      {d && (
        <Card title="Hồ sơ khiếu nại">
          <div className="grid gap-4 text-sm lg:grid-cols-2">
            <div className="space-y-2">
              <p><b>Người mua:</b> {DISPUTE_REASON[d.reason] ?? d.reason} · {formatDate(d.openedAt)} {d.hasUnboxingVideo ? "· có video mở hàng" : <span className="text-amber-700">· không có video mở hàng</span>}</p>
              <p className="whitespace-pre-line">{d.description}</p>
              <Evidence ids={d.mediaIds} secure />
            </div>
            <div className="space-y-2">
              <p><b>Người bán:</b> {d.sellerResponse ?? `chưa phản hồi (hạn ${formatDate(d.sellerDueAt)})`} {d.sellerOfferAmount ? `· đề xuất hoàn ${formatVnd(d.sellerOfferAmount)}` : ""}</p>
              {d.sellerNote && <p className="whitespace-pre-line">{d.sellerNote}</p>}
              <Evidence ids={d.sellerMediaIds} />
            </div>
          </div>
          {d.outcome && <Alert kind="ok">Kết quả: {d.outcome} — {d.resolutionNote} {d.resolvedRefund ? `(hoàn ${formatVnd(d.resolvedRefund)})` : ""}</Alert>}
          {o.status === "Disputed" && can("dispute.resolve") && (
            <div className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">
              <p className="font-medium">Phân xử (BR-DSP-03)</p>
              <div className="flex flex-wrap gap-2">
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={input}>
                  <option value="RejectClaim">Bác khiếu nại — hoàn thành đơn</option>
                  <option value="PartialRefund">Hoàn một phần</option>
                  <option value="FullRefund">Hoàn toàn bộ, không cần trả cây</option>
                  <option value="FullRefundWithReturn">Hoàn toàn bộ, yêu cầu trả cây (đơn ≥ 5 triệu)</option>
                </select>
                {outcome === "PartialRefund" && <input type="number" min={1000} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={input} placeholder="Số tiền hoàn" />}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${input} w-full`} placeholder="Lý do phân xử (bắt buộc, gửi cho hai bên)" />
              <button onClick={resolve} disabled={!note.trim()} className={btn.primary}>Ra quyết định</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
