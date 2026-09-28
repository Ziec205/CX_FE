import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SignInPrompt } from "@/components/SignInPrompt";
import { colors, s } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { createChatConnection } from "@/lib/realtime";

export interface Conv {
  id: string; listingId: string; listing: { title: string; thumbUrl?: string }; last?: { preview: string; at: string };
  role: "buyer" | "seller"; unread: number; blocked: boolean;
}

export default function ChatsScreen() {
  const { me } = useAuth();
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!me) return;
    setLoading(true);
    api<Conv[]>("conversations").then(setItems, () => {}).finally(() => setLoading(false));
  }, [me]);
  useFocusEffect(load);
  // Đang mở danh sách thì tin mới (từ web hay thiết bị khác) cập nhật ngay, không cần kéo tải lại.
  useFocusEffect(useCallback(() => {
    if (!me) return;
    const hub = createChatConnection();
    hub.on("message", () => { api<Conv[]>("conversations").then(setItems, () => {}); });
    hub.start().catch(() => {});
    return () => { hub.stop(); };
  }, [me]));

  if (!me) return <SignInPrompt text="Đăng nhập để nhắn tin với người bán" />;

  return (
    <FlatList style={s.screen} data={items} keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListEmptyComponent={<Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>Chưa có cuộc trò chuyện.</Text>}
      renderItem={({ item: c }) => (
        <Pressable onPress={() => router.push(`/chat/${c.id}`)} style={{ flexDirection: "row", gap: 10, padding: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border }}>
          <Image source={{ uri: mediaUrl(c.listing.thumbUrl) }} style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: "#f5f5f4" }} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontWeight: "600" }}>{c.listing.title}</Text>
            <Text numberOfLines={1} style={s.muted}>{c.role === "buyer" ? "Bạn mua" : "Bạn bán"} · {c.last?.preview}</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>{timeAgo(c.last?.at)}</Text>
          </View>
          {c.unread > 0 && <Text style={{ alignSelf: "center", backgroundColor: colors.rose, color: "#fff", borderRadius: 10, paddingHorizontal: 7, fontSize: 12, overflow: "hidden" }}>{c.unread}</Text>}
        </Pressable>
      )} />
  );
}
