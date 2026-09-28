import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, Chip, colors, Notice, s } from "@/components/ui";
import { api, errorText, newKey } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import { priceLabel } from "@/lib/format";
import type { ListingCard } from "@/lib/types";

interface MyListing { card: ListingCard; rejectReason?: string | null; hasPendingRevision: boolean; expiresAt?: string | null }
const STATUS: Record<string, string> = {
  Active: "Đang hiển thị", PendingReview: "Chờ duyệt", Rejected: "Bị từ chối", Hidden: "Đã ẩn", SoldOut: "Đã bán",
  Expired: "Hết hạn", TempHidden: "Tạm ẩn", Removed: "Bị gỡ", Draft: "Nháp",
};

export default function AccountScreen() {
  const { me, signOut } = useAuth();
  const [items, setItems] = useState<MyListing[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  const load = useCallback(() => {
    if (!me) return;
    api<MyListing[]>(`me/listings${filter ? `?status=${filter}` : ""}`).then(setItems, (e) => setMsg({ kind: "err", text: errorText(e) }));
  }, [me, filter]);
  useFocusEffect(load);

  if (!me) return <SignInPrompt text="Đăng nhập để quản lý tin và ví Xu" />;

  async function act(id: string, action: string, body?: unknown) {
    try {
      if (action === "delete") await api(`listings/${id}`, { method: "DELETE" });
      else await api(`listings/${id}/${action}`, { method: "POST", json: body ?? {} });
      setMsg({ kind: "ok", text: "Đã cập nhật" });
      load();
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  async function bump(l: ListingCard) {
    try {
      const q = await api<{ finalPrice: number; priceBookVersion: number }>(`pricing/quote?service=BUMP&categoryId=${l.categoryId}`, { auth: false });
      Alert.alert("Đẩy tin lên đầu", `Dùng ${q.finalPrice} Xu để đưa tin lên đầu danh sách “Mới nhất”?`, [
        { text: "Hủy", style: "cancel" },
        { text: "Đẩy tin", onPress: () => api(`listings/${l.id}/promotions`, { method: "POST", json: {
          service: "BUMP", days: null, expectedPriceBookVersion: q.priceBookVersion, expectedPrice: q.finalPrice, idempotencyKey: newKey(),
        } }).then(() => { setMsg({ kind: "ok", text: "Đã đẩy tin" }); load(); }, (e) => setMsg({ kind: "err", text: errorText(e) })) },
      ]);
    } catch (e) { setMsg({ kind: "err", text: errorText(e) }); }
  }

  function actions(l: ListingCard) {
    const opts: { text: string; onPress: () => void; style?: "destructive" }[] = [];
    if (l.status === "Active" && l.type !== "Give") opts.push({ text: "🚀 Đẩy tin", onPress: () => bump(l) });
    if (l.status === "Active") opts.push({ text: "Ẩn tin", onPress: () => act(l.id, "hide") });
    if (l.status === "Hidden") opts.push({ text: "Hiện lại", onPress: () => act(l.id, "unhide") });
    if (l.status === "Active" || l.status === "Hidden") opts.push({ text: "Đã bán", onPress: () => act(l.id, "mark-sold") });
    if (l.status === "Expired") opts.push({ text: "Gia hạn miễn phí", onPress: () => act(l.id, "renew") });
    opts.push({ text: "Xóa tin", style: "destructive", onPress: () => act(l.id, "delete") });
    Alert.alert(l.title, undefined, [...opts, { text: "Đóng", onPress: () => {} }]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Card>
        <Text style={s.h2}>{me.displayName}</Text>
        <Text style={s.muted}>{me.phone}{me.flags.hasActivePlan ? " · ✔ Nhà vườn/Shop" : me.flags.isProSeller ? " · Bán chuyên" : ""}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="💰 Ví Xu" variant="secondary" onPress={() => router.push("/wallet")} style={{ flex: 1 }} />
          <Button title="Đăng xuất" variant="danger" onPress={signOut} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="🛡 Đơn đảm bảo" variant="secondary" onPress={() => router.push("/orders")} style={{ flex: 1 }} />
          <Button title="💬 Cộng đồng" variant="secondary" onPress={() => router.push("/community")} style={{ flex: 1 }} />
        </View>
      </Card>
      {msg && <Notice kind={msg.kind} text={msg.text} />}
      <Text style={s.h2}>Tin của tôi</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {[["", "Tất cả"], ["Active", "Đang hiển thị"], ["PendingReview", "Chờ duyệt"], ["Rejected", "Bị từ chối"], ["Expired", "Hết hạn"]].map(([v, l]) =>
          <Chip key={v} label={l} active={filter === v} onPress={() => setFilter(v)} />)}
      </ScrollView>
      {items.length === 0 && <Text style={s.muted}>Chưa có tin nào.</Text>}
      {items.map(({ card: l, rejectReason }) => (
        <Pressable key={l.id} onPress={() => actions(l)} style={{ flexDirection: "row", gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border }}>
          <Image source={{ uri: mediaUrl(l.thumbUrl) }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: "#f5f5f4" }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ fontWeight: "600" }}>{l.title}</Text>
            <Text style={[s.price, { fontSize: 13 }]}>{priceLabel(l)}</Text>
            <Text style={s.muted}>{STATUS[l.status] ?? l.status}{l.isPriority ? " · Ưu tiên" : ""}</Text>
            {rejectReason && <Text style={{ fontSize: 12, color: colors.red }}>Lý do: {rejectReason}</Text>}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
