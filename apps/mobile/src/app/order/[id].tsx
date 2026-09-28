import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Button, Card, Chip, colors, Field, Notice, s } from "@/components/ui";
import { api, errorText, uploadPhoto } from "@/lib/api";
import { DELIVERY, ORDER_STATUS } from "@/lib/escrow";
import { vnd } from "@/lib/format";

interface Order {
  id: string; code: string; listingTitle: string; status: string; delivery: string; quantity: number; unitPrice: number; itemAmount: number;
  shippingFee: number; total: number; refundAmount: number; payoutAmount?: number | null; fee: number;
  paymentDueAt?: string | null; sellerConfirmDueAt?: string | null; shipDueAt?: string | null; inspectionDueAt?: string | null; pickupDate?: string | null;
  deliveryAddress?: string | null; shipment?: { carrier?: string | null; trackingCode?: string | null } | null; reviewed: boolean;
  dispute?: { reason: string; description: string; sellerResponse?: string | null; sellerOfferAmount?: number | null; sellerNote?: string | null; sellerRespondedAt?: string | null; resolutionNote?: string | null } | null;
  history: { status: string; note?: string | null; at: string }[];
}
interface Detail { order: Order; role: "buyer" | "seller"; payout: number }

const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—");
const REASONS: [string, string][] = [["DeadOrWilted", "Cây chết/héo"], ["DamagedInTransit", "Gãy, dập"], ["WrongSpecies", "Sai loài"], ["WrongSize", "Sai kích thước"], ["MissingQuantity", "Thiếu SL"], ["NotReceived", "Không nhận được"], ["Other", "Khác"]];

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<Detail>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [code, setCode] = useState("");
  const [pickupCode, setPickupCode] = useState<string>();
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("DeadOrWilted");
  const [desc, setDesc] = useState("");
  const [disputing, setDisputing] = useState(false);

  const load = useCallback(() => { api<Detail>(`escrow/orders/${id}`).then(setD, (e) => setMsg({ kind: "err", text: errorText(e) })); }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (d?.role === "buyer" && d.order.delivery === "BuyerPickup" && d.order.status === "Paid")
      api<{ code: string }>(`escrow/orders/${id}/pickup-code`).then((r) => setPickupCode(r.code), () => {});
  }, [d, id]);

  async function act(path: string, json?: unknown, ok?: string) {
    try { await api(`escrow/orders/${id}/${path}`, { method: "POST", json: json ?? {} }); if (ok) setMsg({ kind: "ok", text: ok }); setPhotoIds([]); load(); }
    catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function addPhoto(kind = "ListingPhoto") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (r.canceled) return;
    try { const up = await uploadPhoto(r.assets[0], true, kind); setPhotoIds((p) => [...p, up.id]); } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }
  async function pay() {
    try {
      const session = await api<{ checkoutUrl: string }>(`escrow/orders/${id}/pay`, { method: "POST" });
      await WebBrowser.openBrowserAsync(session.checkoutUrl);
      load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  if (!d) return <View style={[s.screen, { padding: 14 }]}>{msg && <Notice kind={msg.kind} text={msg.text} />}</View>;
  const o = d.order;
  const buyer = d.role === "buyer";
  const confirm = (title: string, fn: () => void) => Alert.alert(title, undefined, [{ text: "Không", style: "cancel" }, { text: "Đồng ý", onPress: fn }]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Card>
        <Text style={s.h2}>Đơn {o.code}</Text>
        <Text style={{ color: colors.greenDark, fontWeight: "600" }}>{ORDER_STATUS[o.status] ?? o.status}</Text>
        <Text numberOfLines={2}>{o.listingTitle}</Text>
        <Text style={s.muted}>{o.quantity} × {vnd(o.unitPrice)} + ship {vnd(o.shippingFee)} = {vnd(o.total)}</Text>
        <Text style={s.muted}>{DELIVERY[o.delivery]}{o.deliveryAddress ? ` · ${o.deliveryAddress}` : ""}{o.shipment?.trackingCode ? ` · ${o.shipment.carrier} ${o.shipment.trackingCode}` : ""}</Text>
        {!buyer && <Text style={s.muted}>Bạn nhận: {vnd(o.payoutAmount ?? d.payout)}</Text>}
        {o.refundAmount > 0 && <Text style={s.muted}>Đã hoàn: {vnd(o.refundAmount)}</Text>}
      </Card>
      {msg && <Notice kind={msg.kind} text={msg.text} />}

      <Card>
        {buyer && o.status === "AwaitingPayment" && <>
          <Text>Thanh toán trước {dt(o.paymentDueAt)} để giữ cây.</Text>
          <Button title={`Thanh toán ${vnd(o.total)}`} onPress={pay} />
          <Button title="Hủy đơn" variant="secondary" onPress={() => act("cancel", { reason: "Người mua hủy" })} />
        </>}
        {buyer && o.status === "AwaitingSellerConfirm" && <Text>Tiền đã được giữ. Người bán có 24 giờ để xác nhận còn hàng.</Text>}
        {buyer && o.status === "Paid" && o.delivery === "BuyerPickup" && <>
          <Text>Đưa mã này cho người bán khi nhận cây:</Text>
          <Text selectable style={{ fontSize: 24, fontWeight: "700", letterSpacing: 3, textAlign: "center", color: colors.greenDark }}>{pickupCode ?? "…"}</Text>
        </>}
        {buyer && o.status === "Shipping" && o.delivery === "SelfArrangedCarrier" && <Button title="Tôi đã nhận hàng ở nhà xe" onPress={() => act("received", undefined, "Bạn có 48 giờ để kiểm tra cây.")} />}
        {buyer && o.status === "Delivered" && <>
          <Text>Quay video mở hàng. Hạn kiểm tra: {dt(o.inspectionDueAt)}</Text>
          <Button title="Cây đúng mô tả, tôi hài lòng" onPress={() => confirm("Xác nhận hoàn thành đơn?", () => act("accept", undefined, "Đơn đã hoàn thành"))} />
          <Button title="Có vấn đề — khiếu nại" variant="danger" onPress={() => setDisputing(true)} />
        </>}
        {buyer && disputing && (o.status === "Delivered" || o.status === "Shipping") && <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{REASONS.map(([k, l]) => <Chip key={k} label={l} active={reason === k} onPress={() => setReason(k)} />)}</View>
          <Field label="Mô tả" value={desc} onChangeText={setDesc} multiline />
          <Button title={`📷 Ảnh bằng chứng (${photoIds.length})`} variant="secondary" onPress={() => addPhoto("DisputeEvidence")} />
          <Button title="Gửi khiếu nại" variant="danger" onPress={() => act("dispute", { reason, description: desc, mediaIds: photoIds, hasUnboxingVideo: false })} />
        </>}
        {buyer && o.status === "Disputed" && o.dispute?.sellerResponse === "OfferPartialRefund" &&
          <Button title={`Chấp nhận hoàn ${vnd(o.dispute.sellerOfferAmount)}`} onPress={() => act("dispute/accept-proposal")} />}
        {buyer && (o.status === "Completed" || o.status === "Settled" || o.status === "PartiallyRefunded") && !o.reviewed &&
          <Button title="⭐ Đánh giá 5 sao “Đã mua hàng”" variant="secondary" onPress={() => act("review", { stars: 5 }, "Cảm ơn bạn đã đánh giá")} />}

        {!buyer && o.status === "AwaitingSellerConfirm" && <>
          <Text>Xác nhận còn hàng trước {dt(o.sellerConfirmDueAt)}.</Text>
          <Button title="Còn hàng, xác nhận" onPress={() => act("confirm")} />
          <Button title="Hết hàng" variant="danger" onPress={() => act("cancel", { reason: "Hết hàng" })} />
        </>}
        {!buyer && o.status === "Paid" && o.delivery === "BuyerPickup" && <>
          <Field label="Mã nhận hàng trên máy người mua" value={code} onChangeText={(t) => setCode(t.trim().toUpperCase())} autoCapitalize="characters" />
          <Button title="Xác nhận đã giao tại vườn" onPress={() => act("pickup", { code }, "Đơn đã hoàn thành")} />
        </>}
        {!buyer && o.status === "Paid" && o.delivery !== "BuyerPickup" && <>
          <Text>Gửi hàng trước {dt(o.shipDueAt)}.</Text>
          {o.delivery === "SelfArrangedCarrier" && <>
            <Field label="Nhà xe" value={carrier} onChangeText={setCarrier} />
            <Field label="Mã vận đơn" value={tracking} onChangeText={setTracking} />
          </>}
          <Button title={`📷 Ảnh đóng gói / phiếu gửi (${photoIds.length})`} variant="secondary" onPress={() => addPhoto()} />
          <Button title="Đã gửi / đang giao" onPress={() => act("ship", { carrier, trackingCode: tracking, mediaIds: photoIds, expectedArrival: o.delivery === "SelfArrangedCarrier" ? new Date(Date.now() + 2 * 864e5).toISOString() : null })} />
        </>}
        {!buyer && o.status === "Shipping" && o.delivery === "SellerDelivery" && <>
          <Button title={`📷 Ảnh giao hàng (${photoIds.length})`} variant="secondary" onPress={() => addPhoto()} />
          <Button title="Đã giao hàng" onPress={() => act("delivered", { mediaIds: photoIds }, "Người mua có 48 giờ kiểm tra")} />
        </>}
        {!buyer && o.status === "Disputed" && !o.dispute?.sellerRespondedAt && <>
          <Text>Người mua khiếu nại: {o.dispute?.description}</Text>
          <Button title="Đồng ý hoàn toàn bộ" variant="danger" onPress={() => confirm("Hoàn 100% cho người mua?", () => act("dispute/respond", { response: "AcceptFullRefund" }))} />
          <Button title="Phản bác (CSKH sẽ phân xử)" variant="secondary" onPress={() => act("dispute/respond", { response: "Reject", note: "Người bán phản bác" })} />
        </>}
        {o.dispute?.resolutionNote && <Notice kind="info" text={`Kết quả khiếu nại: ${o.dispute.resolutionNote}`} />}
      </Card>

      <Card>
        <Text style={s.h2}>Lịch sử</Text>
        {o.history.map((h, i) => <Text key={i} style={{ fontSize: 13 }}>{dt(h.at)} · {ORDER_STATUS[h.status] ?? h.status}{h.note ? ` — ${h.note}` : ""}</Text>)}
      </Card>
    </ScrollView>
  );
}
