import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, colors, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AppNotification } from "@/lib/types";

/** Đường dẫn web của thông báo → màn hình tương ứng trong app. */
function openLink(link?: string | null) {
  if (!link) return;
  if (link.startsWith("/vuon-cua-toi")) router.push("/garden");
  else if (link.startsWith("/don-hang/")) router.push(`/order/${link.split("/")[2]}`);
  else if (link.startsWith("/tin/")) router.push(`/listing/${link.split("/")[2]}`);
  else if (link.startsWith("/cong-dong/")) router.push(`/community/${link.split("/")[2]}`);
}

export default function NotificationsScreen() {
  const { me } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    if (!me) return;
    setLoading(true);
    api<{ items: AppNotification[] }>("me/notifications").then((r) => setItems(r.items), (e) => setError(errorText(e))).finally(() => setLoading(false));
  }, [me]);
  useFocusEffect(load);

  if (!me) return <SignInPrompt text="Đăng nhập để xem thông báo" />;

  function open(n: AppNotification) {
    if (!n.readAt) {
      api(`me/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
      setItems(items.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    openLink(n.link);
  }

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      data={items}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 4 }}>
          {error && <Notice text={error} />}
          {items.some((n) => !n.readAt) && <Button title="Đánh dấu đã đọc hết" variant="secondary" onPress={() => api("me/notifications/read-all", { method: "POST" }).then(load)} />}
        </View>
      }
      renderItem={({ item: n }) => (
        <Pressable onPress={() => open(n)} style={{ backgroundColor: n.readAt ? colors.white : colors.greenLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontWeight: "700" }}>{n.title}</Text>
          {n.body ? <Text style={{ color: colors.text }}>{n.body}</Text> : null}
          <Text style={s.muted}>{new Date(n.createdAt).toLocaleString("vi-VN")}</Text>
        </Pressable>
      )}
      ListEmptyComponent={loading ? null : <Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>Chưa có thông báo.</Text>}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    />
  );
}
