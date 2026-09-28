import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Dimensions, FlatList, Linking, ScrollView, Text, View } from "react-native";
import { Button, Card, colors, Notice, s } from "@/components/ui";
import { api, errorText, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import { priceLabel, timeAgo, TYPE_LABEL } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import type { Category, ListingDetail, Species } from "@/lib/types";

const W = Dimensions.get("window").width;

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useAuth();
  const [d, setD] = useState<ListingDetail>();
  const [category, setCategory] = useState<Category>();
  const [species, setSpecies] = useState<Species>();
  const [phone, setPhone] = useState<string>();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();

  useEffect(() => {
    api<ListingDetail>(`listings/${id}`).then(async (r) => {
      setD(r);
      api<Category>(`categories/${r.card.categoryId}`, { auth: false }).then(setCategory, () => {});
      if (r.card.speciesId && r.card.speciesId !== "khac") api<Species>(`species/${r.card.speciesId}`, { auth: false }).then(setSpecies, () => {});
    }, (e) => setMsg({ kind: "err", text: errorText(e) }));
  }, [id]);

  if (!d) return <View style={[s.screen, { padding: 16 }]}>{msg ? <Notice text={msg.text} /> : <Text style={s.muted}>Đang tải…</Text>}</View>;
  const l = d.card;
  const isOwner = me?.id === l.seller.id;

  function needLogin(e: unknown) {
    if ((e as ApiError).status === 401) router.push("/login");
    else setMsg({ kind: "err", text: errorText(e) });
  }
  const chat = async () => {
    try { const c = await api<{ id: string }>("conversations", { method: "POST", json: { listingId: l.id } }); router.push(`/chat/${c.id}`); }
    catch (e) { needLogin(e); }
  };
  const showPhone = async () => {
    try { setPhone((await api<{ phone: string }>(`listings/${l.id}/phone`)).phone); } catch (e) { needLogin(e); }
  };
  const save = async () => {
    try { await api(`me/favorites/${l.id}`, { method: "PUT" }); setMsg({ kind: "ok", text: "Đã lưu tin" }); } catch (e) { needLogin(e); }
  };
  const report = () => Alert.alert("Báo cáo tin", "Lý do", [
    ...([["Scam", "Lừa đảo"], ["FakePhoto", "Ảnh không thật"], ["AlreadySold", "Hàng đã bán"]] as const).map(([v, t]) => ({
      text: t, onPress: () => api(`listings/${l.id}/reports`, { method: "POST", json: { reason: v } }).then(() => setMsg({ kind: "ok", text: "Cảm ơn bạn đã báo cáo" }), needLogin),
    })),
    { text: "Hủy", style: "cancel" as const },
  ]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ title: l.title }} />
      <FlatList horizontal pagingEnabled data={d.photoUrls} keyExtractor={(u) => u} showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <Image source={{ uri: mediaUrl(item) }} style={{ width: W, height: W * 0.8, backgroundColor: "#1c1917" }} contentFit="contain" />}
        ListEmptyComponent={<Text style={{ width: W, height: 200, textAlign: "center", fontSize: 60, paddingTop: 60 }}>🌱</Text>} />

      <View style={{ padding: 14, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={s.muted}>{TYPE_LABEL[l.type]}{l.realPhoto ? " · 📸 Ảnh chụp thực tế" : ""}{l.escrow ? " · 🛡 Giao dịch đảm bảo" : ""}</Text>
          <Text style={s.h1}>{l.title}</Text>
          <Text style={[s.price, { fontSize: 22 }]}>{priceLabel(l)}</Text>
          <Text style={s.muted}>{provinceName(l.provinceId)} · {timeAgo(l.bumpedAt)} · {d.views} lượt xem</Text>
        </View>
        {l.status !== "Active" && <Notice kind="warn" text={l.status === "SoldOut" ? "Tin này đã bán hết" : "Tin này hiện không hiển thị"} />}
        {msg && <Notice kind={msg.kind} text={msg.text} />}

        <Card>
          <Text style={{ fontWeight: "700" }}>{l.seller.displayName}</Text>
          <Text style={s.muted}>{l.seller.isGarden ? "✔ Nhà vườn/Shop" : l.seller.isProSeller ? "Bán chuyên" : "Cá nhân"}</Text>
          {isOwner ? <Text style={s.muted}>Đây là tin của bạn — quản lý trong tab Tài khoản.</Text> : (
            <View style={{ gap: 8 }}>
              {l.escrow && l.type === "Sell" && l.priceMode !== "Negotiable" && l.available > 0 && (
                <Button title="🛡 Mua đảm bảo" onPress={() => router.push({ pathname: "/checkout", params: { listingId: l.id, mode: "escrow" } })} />
              )}
              {l.type === "Rent" && <Button title="📅 Đặt lịch thuê" onPress={() => router.push({ pathname: "/checkout", params: { listingId: l.id, mode: "rent" } })} />}
              <Button title="💬 Nhắn tin" variant={l.escrow || l.type === "Rent" ? "secondary" : "primary"} onPress={chat} />
              {phone ? <Button title={`📞 Gọi ${phone}`} variant="secondary" onPress={() => Linking.openURL(`tel:${phone}`)} />
                : <Button title="📞 Hiện số điện thoại" variant="secondary" onPress={showPhone} />}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="♡ Lưu" variant="secondary" onPress={save} style={{ flex: 1 }} />
                <Button title="⚑ Báo cáo" variant="secondary" onPress={report} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={s.h2}>Thông tin</Text>
          {species && <Row k="Loài" v={species.commonName} />}
          {category && <Row k="Danh mục" v={category.name} />}
          {l.type !== "Buy" && <Row k="Còn" v={`${l.available} ${l.unit}`} />}
          {Object.entries(d.attributes).map(([k, v]) => {
            const def = category?.attributes.find((a) => a.key === k);
            const text = typeof v === "boolean" ? (v ? "Có" : "Không") : Array.isArray(v) ? v.join(", ") : `${v}${def?.unit ? ` ${def.unit}` : ""}`;
            return <Row key={k} k={def?.label ?? k} v={text} />;
          })}
          <Text style={s.h2}>Mô tả</Text>
          <Text style={{ lineHeight: 21 }}>{d.description}</Text>
        </Card>

        {species && (
          <Card style={{ backgroundColor: colors.greenLight }}>
            <Text style={s.h2}>Về cây {species.commonName}</Text>
            {species.light && <Text>☀️ Ánh sáng: {species.light}</Text>}
            {species.petToxicity && <Text>🐾 {species.petToxicity}</Text>}
          </Card>
        )}
        <Notice kind="warn" text="Xem cây tận mắt trước khi trả tiền, không chuyển cọc cho người lạ, không đọc mã OTP cho bất kỳ ai." />
      </View>
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={s.muted}>{k}</Text><Text style={{ flexShrink: 1, textAlign: "right" }}>{v}</Text></View>;
}
