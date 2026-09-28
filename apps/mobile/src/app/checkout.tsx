import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Chip, Field, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DELIVERY } from "@/lib/escrow";

/** dd/mm/yyyy → ISO (00:00 giờ máy); null nếu ngày không có thật. */
function parseDate(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d.toISOString() : null;
}

/** Mua qua Giao dịch đảm bảo hoặc gửi yêu cầu thuê cây. */
export default function CheckoutScreen() {
  const { listingId, mode } = useLocalSearchParams<{ listingId: string; mode: "escrow" | "rent" }>();
  const { me } = useAuth();
  const [delivery, setDelivery] = useState("SellerDelivery");
  const [qty, setQty] = useState("1");
  const [address, setAddress] = useState("");
  const [ship, setShip] = useState("0");
  const [pickup, setPickup] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!me) return <SignInPrompt text="Đăng nhập để tiếp tục" />;

  async function submit() {
    setError(undefined);
    setBusy(true);
    try {
      if (mode === "rent") {
        const [from, to] = [parseDate(start), parseDate(end)];
        if (!from || !to) throw { message: "Nhập ngày theo dạng dd/mm/yyyy" };
        await api(`listings/${listingId}/rentals`, { method: "POST", json: { startDate: from, endDate: to, quantity: Number(qty) || 1, note: note || null, deliveryAddress: address || null } });
        setDone("Đã gửi yêu cầu thuê. Chủ cây sẽ xác nhận lịch.");
      } else {
        const pickupDate = delivery === "BuyerPickup" ? parseDate(pickup) : null;
        if (delivery === "BuyerPickup" && !pickupDate) throw { message: "Nhập ngày hẹn lấy dạng dd/mm/yyyy" };
        const o = await api<{ id: string }>("escrow/orders", { method: "POST", json: {
          listingId, quantity: Number(qty) || 1, delivery, deliveryAddress: delivery === "BuyerPickup" ? null : address,
          shippingFee: delivery === "BuyerPickup" ? 0 : Number(ship) || 0, pickupDate,
        } });
        router.replace(`/order/${o.id}`);
      }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Stack.Screen options={{ title: mode === "rent" ? "Đặt lịch thuê" : "Mua đảm bảo" }} />
      {done ? <Notice kind="ok" text={done} /> : <>
        {mode !== "rent" && <Notice kind="info" text="Tiền được đối tác thanh toán giữ đến khi bạn xác nhận nhận cây đúng mô tả. Có vấn đề thì khiếu nại trong 48 giờ." />}
        <Field label="Số lượng" value={qty} onChangeText={setQty} keyboardType="number-pad" />
        {mode === "rent" ? <>
          <Field label="Từ ngày (dd/mm/yyyy)" required value={start} onChangeText={setStart} />
          <Field label="Đến ngày (dd/mm/yyyy)" required value={end} onChangeText={setEnd} />
          <Field label="Địa chỉ nhận cây" value={address} onChangeText={setAddress} />
          <Field label="Ghi chú" value={note} onChangeText={setNote} multiline />
        </> : <>
          <Text style={s.label}>Hình thức giao nhận</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {["SellerDelivery", "BuyerPickup", "SelfArrangedCarrier"].map((d) => <Chip key={d} label={DELIVERY[d]} active={delivery === d} onPress={() => setDelivery(d)} />)}
          </View>
          {delivery === "BuyerPickup"
            ? <Field label="Ngày hẹn lấy (dd/mm/yyyy)" required value={pickup} onChangeText={setPickup} />
            : <>
              <Field label="Địa chỉ nhận hàng" required value={address} onChangeText={setAddress} multiline />
              <Field label="Phí giao đã thỏa thuận (đ)" value={ship} onChangeText={setShip} keyboardType="number-pad" />
            </>}
        </>}
        {error && <Notice text={error} />}
        <Button title={mode === "rent" ? "Gửi yêu cầu thuê" : "Tạo đơn và thanh toán"} onPress={submit} loading={busy} />
      </>}
    </ScrollView>
  );
}
