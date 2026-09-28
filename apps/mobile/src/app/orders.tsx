import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Chip, colors, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import { ORDER_STATUS } from "@/lib/escrow";
import { vnd } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export default function OrdersScreen() {
  const { me } = useAuth();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    if (!me) return;
    api<OrderSummary[]>(`escrow/orders?role=${role}`).then(setItems, (e) => setError(errorText(e)));
  }, [me, role]);
  useFocusEffect(load);

  if (!me) return <SignInPrompt text="Đăng nhập để xem đơn đảm bảo" />;
  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      data={items}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
          <Chip label="Tôi mua" active={role === "buyer"} onPress={() => setRole("buyer")} />
          <Chip label="Tôi bán" active={role === "seller"} onPress={() => setRole("seller")} />
          {error && <Notice text={error} />}
        </View>
      }
      renderItem={({ item: o }) => (
        <Pressable onPress={() => router.push(`/order/${o.id}`)} style={{ flexDirection: "row", gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border }}>
          <Image source={{ uri: mediaUrl(o.thumbUrl) }} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: "#f5f5f4" }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ fontWeight: "600" }}>{o.listingTitle}</Text>
            <Text style={s.muted}>Mã {o.code} · {vnd(o.total)}</Text>
            <Text style={{ fontSize: 13, color: colors.greenDark }}>{ORDER_STATUS[o.status] ?? o.status}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>Chưa có đơn nào.</Text>}
    />
  );
}
