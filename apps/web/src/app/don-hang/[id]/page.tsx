"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PhotoPicker, type UploadedPhoto } from "@/components/PhotoPicker";
import { Alert, Label, Section, btn, field } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { DELIVERY, DISPUTE_REASON, ORDER_STATUS, TONE_CLASS } from "@/lib/escrow";
import { vnd } from "@/lib/format";
import type { EscrowOrder, MediaDto } from "@/lib/types";

interface Detail { order: EscrowOrder; role: "buyer" | "seller"; payout: number; photos: MediaDto[] }

const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<Detail>();
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();

  const load = useCallback(() => {
    api<Detail>(`escrow/orders/${id}`).then(setD, (e) => {
      if ((e as ApiError).status === 401) router.push(`/dang-nhap?next=/don-hang/${id}`);
      else setError(errorText(e));
    });
  }, [id, router]);
  useEffect(load, [load]);

  async function act(path: string, json?: unknown, done?: string) {
    setError(undefined); setInfo(undefined);
    try {
      await api(`escrow/orders/${id}/${path}`, { method: "POST", json: json ?? {} });
      if (done) setInfo(done);
      load();
    } catch (e) { setError(errorText(e)); }
  }

  if (!d) return error ? <Alert>{error}</Alert> : <p className="text-stone-500">Đang tải…</p>;
  const o = d.order;
  const s = ORDER_STATUS[o.status];
  const buyer = d.role === "buyer";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div>
          <Link href="/don-hang" className="text-sm text-emerald-700 hover:underline">← Đơn đảm bảo</Link>
          <h1 className="mt-1 text-3xl font-extrabold text-emerald-900">Đơn {o.code}</h1>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm ${TONE_CLASS[s.tone]}`}>{s.label}</span>
        </div>
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="ok">{info}</Alert>}

        <Actions d={d} act={act} reload={load} />

        {o.dispute && <DisputeBox d={d} act={act} />}

        <Section title="Lịch sử">
          <ol className="space-y-2 border-l-2 border-emerald-200 pl-4">
            {o.history.map((h, i) => (
              <li key={i} className="text-[15px]">
                <b>{ORDER_STATUS[h.status as keyof typeof ORDER_STATUS]?.label ?? h.status}</b>
                <span className="ml-2 text-sm text-stone-500">{dt(h.at)}</span>
                {h.note && <span className="block text-sm text-stone-600">{h.note}</span>}
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <aside className="space-y-4">
        <Section title="Chi tiết">
          <Link href={`/tin/${o.listingId}`} className="font-bold hover:underline">{o.listingTitle}</Link>
          <dl className="mt-3 space-y-1.5 text-[15px]">
            <Row k="Số lượng" v={`${o.quantity} × ${vnd(o.unitPrice)}`} />
            <Row k="Tiền cây" v={vnd(o.itemAmount)} />
            <Row k="Phí giao" v={vnd(o.shippingFee)} />
            <Row k="Tổng" v={<b>{vnd(o.total)}</b>} />
            {o.refundAmount > 0 && <Row k="Đã hoàn" v={vnd(o.refundAmount)} />}
            {!buyer && <Row k="Phí dịch vụ (tạm tính)" v={vnd(o.fee)} />}
            {!buyer && <Row k="Bạn nhận" v={<b className="text-emerald-800">{vnd(o.payoutAmount ?? d.payout)}</b>} />}
            <Row k="Giao nhận" v={DELIVERY[o.delivery].label} />
            {o.deliveryAddress && <Row k="Địa chỉ" v={o.deliveryAddress} />}
            {o.pickupDate && <Row k="Hẹn lấy" v={new Date(o.pickupDate).toLocaleDateString("vi-VN")} />}
            {o.shipment?.trackingCode && <Row k="Vận đơn" v={`${o.shipment.carrier} · ${o.shipment.trackingCode}`} />}
            {o.inspectionDueAt && o.status === "Delivered" && <Row k="Hạn kiểm tra" v={dt(o.inspectionDueAt)} />}
          </dl>
        </Section>
        {d.photos.length > 0 && (
          <Section title="Ảnh giao hàng">
            <div className="grid grid-cols-3 gap-2">
              {d.photos.map((m) => (
                <a key={m.id} href={m.urls.full} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.urls.thumb} alt="" className="aspect-square w-full rounded-lg object-cover" />
                </a>
              ))}
            </div>
          </Section>
        )}
        <Link href={`/ho-tro?order=${o.id}`} className="block text-sm text-emerald-700 hover:underline">Cần hỗ trợ về đơn này?</Link>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-stone-500">{k}</dt><dd className="text-right">{v}</dd></div>;
}

function Actions({ d, act, reload }: { d: Detail; act: (p: string, j?: unknown, done?: string) => Promise<void>; reload: () => void }) {
  const o = d.order;
  const buyer = d.role === "buyer";
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [eta, setEta] = useState("");
  const [code, setCode] = useState("");
  const [pickupCode, setPickupCode] = useState<string>();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!buyer || o.delivery !== "BuyerPickup" || o.status !== "Paid") return;
    let cancelled = false;
    api<{ code: string }>(`escrow/orders/${o.id}/pickup-code`).then((r) => { if (!cancelled) setPickupCode(r.code); }, () => {});
    return () => { cancelled = true; };
  }, [buyer, o.delivery, o.status, o.id]);

  async function pay() {
    setError(undefined);
    try {
      const session = await api<{ checkoutUrl: string }>(`escrow/orders/${o.id}/pay`, { method: "POST" });
      // Môi trường phát triển: giả lập đối tác báo đã thu tiền.
      const dev = await fetch("/api/dev/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: o.id, amountVnd: o.total }) });
      if (dev.status === 404) window.location.href = session.checkoutUrl;
      else reload();
    } catch (e) { setError(errorText(e)); }
  }

  const box = (children: React.ReactNode) => <Section title="Việc cần làm">{error && <Alert>{error}</Alert>}<div className="space-y-3">{children}</div></Section>;

  if (buyer) {
    switch (o.status) {
      case "AwaitingPayment":
        return box(<>
          <p>Thanh toán trước {new Date(o.paymentDueAt!).toLocaleString("vi-VN")} để giữ cây.</p>
          <div className="flex gap-2">
            <button onClick={pay} className={btn.primary}>Thanh toán {vnd(o.total)}</button>
            <button onClick={() => act("cancel", { reason: "Người mua hủy" })} className={btn.secondary}>Hủy đơn</button>
          </div>
        </>);
      case "AwaitingSellerConfirm":
        return box(<p>Tiền đã được giữ. Người bán có 24 giờ để xác nhận còn hàng, quá hạn bạn được hoàn 100%.</p>);
      case "Paid":
        return o.delivery === "BuyerPickup"
          ? box(<>
              <p>Khi tới vườn và ưng cây, đưa mã này cho người bán nhập để hoàn tất:</p>
              <p className="select-all rounded-xl bg-emerald-50 p-4 text-center font-mono text-2xl tracking-widest text-emerald-900">{pickupCode ?? "…"}</p>
              <p className="text-sm text-stone-500">Không đưa mã nếu bạn chưa nhận cây.</p>
            </>)
          : box(<p>Người bán đang chuẩn bị cây, hạn gửi {new Date(o.shipDueAt!).toLocaleDateString("vi-VN")}.</p>);
      case "Shipping":
        return box(<>
          <p>Cây đang trên đường giao.</p>
          {o.delivery === "SelfArrangedCarrier" && <button onClick={() => act("received", undefined, "Đã ghi nhận. Bạn có 48 giờ để kiểm tra cây.")} className={btn.primary}>Tôi đã nhận hàng ở nhà xe</button>}
          <DisputeForm orderId={o.id} onDone={reload} notReceivedOnly />
        </>);
      case "Delivered":
        return box(<>
          <p>Hãy quay video mở hàng liền mạch. Hạn kiểm tra đến <b>{new Date(o.inspectionDueAt!).toLocaleString("vi-VN")}</b>.</p>
          <button onClick={() => act("accept", undefined, "Cảm ơn bạn! Đơn đã hoàn thành.")} className={btn.primary}>Cây đúng mô tả, tôi hài lòng</button>
          <DisputeForm orderId={o.id} onDone={reload} />
        </>);
      case "Completed": case "PartiallyRefunded": case "Settled":
        return o.reviewed ? null : box(<>
          <p>Đánh giá “Đã mua hàng” giúp người mua khác tin tưởng hơn.</p>
          <div className="flex gap-1 text-2xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} sao`}>{n <= stars ? "★" : "☆"}</button>)}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} className={field} placeholder="Nhận xét về cây, đóng gói, người bán…" />
          <button onClick={() => act("review", { stars, text }, "Cảm ơn bạn đã đánh giá!")} className={btn.primary}>Gửi đánh giá</button>
        </>);
      default: return null;
    }
  }

  switch (o.status) {
    case "AwaitingPayment": return box(<p>Chờ người mua thanh toán trước {new Date(o.paymentDueAt!).toLocaleString("vi-VN")}.</p>);
    case "AwaitingSellerConfirm":
      return box(<>
        <p>Người mua đã thanh toán. Xác nhận còn hàng trước <b>{new Date(o.sellerConfirmDueAt!).toLocaleString("vi-VN")}</b>, quá hạn đơn tự hủy và hoàn tiền.</p>
        <div className="flex gap-2">
          <button onClick={() => act("confirm")} className={btn.primary}>Còn hàng, xác nhận</button>
          <button onClick={() => act("cancel", { reason: "Hết hàng" })} className={btn.danger}>Hết hàng</button>
        </div>
      </>);
    case "Paid":
      if (o.delivery === "BuyerPickup")
        return box(<>
          <p>Hẹn người mua ngày {new Date(o.pickupDate!).toLocaleDateString("vi-VN")}. Khi giao cây, nhập mã trên máy người mua:</p>
          <div className="flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value.trim().toUpperCase())} className={field} placeholder="Mã nhận hàng" /><button onClick={() => act("pickup", { code }, "Đơn đã hoàn thành.")} className={btn.primary}>Xác nhận</button></div>
          <button onClick={() => { if (confirm("Hủy đơn và hoàn 100% cho người mua?")) act("cancel", { reason: "Người bán hủy" }); }} className="text-sm text-red-700 hover:underline">Hủy đơn</button>
        </>);
      return box(<>
        <p>Gửi hàng trước {new Date(o.shipDueAt!).toLocaleDateString("vi-VN")}. {o.delivery === "SelfArrangedCarrier" && "Nhập thông tin nhà xe và ảnh phiếu gửi."}</p>
        {o.delivery === "SelfArrangedCarrier" && (
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={field} placeholder="Nhà xe" />
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={field} placeholder="Mã vận đơn" />
            <input type="date" value={eta} onChange={(e) => setEta(e.target.value)} className={field} title="Ngày dự kiến đến" />
          </div>
        )}
        <Label text="Ảnh đóng gói / phiếu gửi"><PhotoPicker value={photos} onChange={setPhotos} max={6} /></Label>
        <div className="flex gap-2">
          <button onClick={() => act("ship", { carrier, trackingCode: tracking, mediaIds: photos.map((p) => p.id), expectedArrival: eta ? new Date(eta).toISOString() : null }, "Đã báo đang giao.").then(() => setPhotos([]))} className={btn.primary}>Đã gửi / đang giao</button>
          <button onClick={() => { if (confirm("Hủy sau khi đã nhận tiền sẽ bị ghi nhận vi phạm. Tiếp tục?")) act("cancel", { reason: "Người bán hủy" }); }} className={btn.danger}>Hủy đơn</button>
        </div>
      </>);
    case "Shipping":
      return o.delivery === "SellerDelivery" ? box(<>
        <p>Khi giao xong, chụp ảnh bằng chứng giao hàng.</p>
        <PhotoPicker value={photos} onChange={setPhotos} max={6} />
        <button onClick={() => act("delivered", { mediaIds: photos.map((p) => p.id) }, "Đã báo giao. Người mua có 48 giờ kiểm tra.")} className={btn.primary}>Đã giao hàng</button>
      </>) : box(<p>Chờ người mua nhận hàng ở nhà xe.</p>);
    case "Delivered": return box(<p>Người mua đang kiểm tra cây (đến {new Date(o.inspectionDueAt!).toLocaleString("vi-VN")}).</p>);
    case "AwaitingReturn":
      return box(<>
        <p>Người mua sẽ gửi trả cây. Khi nhận lại, xác nhận để hoàn tất.</p>
        <button onClick={() => act("return/received", undefined, "Đã xác nhận nhận lại cây.")} className={btn.primary}>Đã nhận lại cây</button>
      </>);
    case "Completed": case "PartiallyRefunded":
      return box(<p>Đơn hoàn thành. Tiền sẽ được chuyển về tài khoản sau T+1 ngày làm việc{o.settlementHold ? " (đang tạm dừng để CSKH kiểm tra)" : ""}.</p>);
    default: return null;
  }
}

function DisputeForm({ orderId, onDone, notReceivedOnly }: { orderId: string; onDone: () => void; notReceivedOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(notReceivedOnly ? "NotReceived" : "DeadOrWilted");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [video, setVideo] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    setError(undefined);
    try {
      await api(`escrow/orders/${orderId}/dispute`, { method: "POST", json: { reason, description: desc, mediaIds: photos.map((p) => p.id), hasUnboxingVideo: video } });
      onDone();
    } catch (e) { setError(errorText(e)); }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="text-sm text-red-700 hover:underline">{notReceivedOnly ? "Chưa nhận được hàng?" : "Có vấn đề với cây? Khiếu nại"}</button>;
  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/40 p-3">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
        {Object.entries(DISPUTE_REASON).filter(([k]) => !notReceivedOnly || k === "NotReceived").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={field} placeholder="Mô tả vấn đề (tối thiểu 10 ký tự)" />
      {reason !== "NotReceived" && <>
        <PhotoPicker value={photos} onChange={setPhotos} max={8} kind="DisputeEvidence" label="Ảnh bằng chứng" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={video} onChange={(e) => setVideo(e.target.checked)} className="accent-emerald-700" />Tôi có video mở hàng liền mạch</label>
      </>}
      {error && <Alert>{error}</Alert>}
      <button onClick={submit} className={btn.danger}>Gửi khiếu nại</button>
    </div>
  );
}

function DisputeBox({ d, act }: { d: Detail; act: (p: string, j?: unknown, done?: string) => Promise<void> }) {
  const o = d.order;
  const x = o.dispute!;
  const buyer = d.role === "buyer";
  const [response, setResponse] = useState("OfferPartialRefund");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  return (
    <Section title="Khiếu nại">
      <p><b>{DISPUTE_REASON[x.reason] ?? x.reason}</b> · {new Date(x.openedAt).toLocaleString("vi-VN")}</p>
      <p className="mt-1 text-stone-700">{x.description}</p>
      {x.sellerRespondedAt && (
        <div className="mt-3 rounded-xl bg-stone-50 p-3 text-[15px]">
          <b>Người bán phản hồi:</b> {x.sellerResponse === "OfferPartialRefund" ? `Đề xuất hoàn ${vnd(x.sellerOfferAmount)}` : x.sellerResponse === "Reject" ? "Phản bác" : x.sellerResponse === "OfferReplacement" ? "Đề xuất đổi cây" : "Đồng ý hoàn"}
          {x.sellerNote && <span className="block text-stone-600">{x.sellerNote}</span>}
        </div>
      )}
      {x.outcome && <Alert kind="info">Kết quả: {x.resolutionNote} {x.resolvedRefund ? `(hoàn ${vnd(x.resolvedRefund)})` : ""}</Alert>}

      {o.status === "Disputed" && !buyer && !x.sellerRespondedAt && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">Phản hồi trước {new Date(x.sellerDueAt).toLocaleString("vi-VN")}, quá hạn sẽ xử có lợi cho người mua.</p>
          <select value={response} onChange={(e) => setResponse(e.target.value)} className={field}>
            <option value="AcceptFullRefund">Đồng ý hoàn toàn bộ</option>
            <option value="OfferPartialRefund">Đề xuất hoàn một phần</option>
            <option value="OfferReplacement">Đề xuất đổi cây</option>
            <option value="Reject">Phản bác (kèm bằng chứng)</option>
          </select>
          {response === "OfferPartialRefund" && <input type="number" min={1000} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={field} placeholder="Số tiền hoàn" />}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={field} placeholder="Ghi chú cho người mua / CSKH" />
          <button onClick={() => act("dispute/respond", { response, amount: response === "OfferPartialRefund" ? amount : null, note })} className={btn.primary}>Gửi phản hồi</button>
        </div>
      )}
      {o.status === "Disputed" && buyer && (
        <div className="mt-3 flex flex-wrap gap-2">
          {x.sellerResponse === "OfferPartialRefund" && <button onClick={() => act("dispute/accept-proposal", undefined, "Đã chấp nhận đề xuất.")} className={btn.primary}>Chấp nhận hoàn {vnd(x.sellerOfferAmount)}</button>}
          <button onClick={() => act("dispute/withdraw", undefined, "Đã rút khiếu nại.")} className={btn.secondary}>Rút khiếu nại</button>
          <p className="w-full text-sm text-stone-500">Không thỏa thuận được, CSKH sẽ phân xử trong 3 ngày làm việc.</p>
        </div>
      )}
      {o.status === "AwaitingReturn" && buyer && !x.returnShippedAt && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={field} placeholder="Nhà xe" />
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={field} placeholder="Mã vận đơn" />
          <button onClick={() => act("return", { carrier, trackingCode: tracking }, "Đã ghi nhận gửi trả.")} className={btn.primary}>Đã gửi trả</button>
        </div>
      )}
    </Section>
  );
}
