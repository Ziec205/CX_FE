import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Chip, colors, Field, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";

interface Post { id: string; type: string; title: string; excerpt: string; likes: number; comments: number; answered: boolean; thumbUrl?: string | null; author?: { name: string; badge: string; expert: boolean } }
const TYPES: [string, string][] = [["", "Tất cả"], ["Question", "Hỏi đáp"], ["Showcase", "Khoe cây"], ["Guide", "Kinh nghiệm"]];

export default function CommunityScreen() {
  const { me } = useAuth();
  const [type, setType] = useState("");
  const [items, setItems] = useState<Post[]>([]);
  const [error, setError] = useState<string>();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newType, setNewType] = useState("Question");

  const load = useCallback(() => {
    api<{ items: Post[] }>(`community/posts${type ? `?type=${type}` : ""}`, { auth: false }).then((r) => setItems(r.items), (e) => setError(errorText(e)));
  }, [type]);
  useFocusEffect(load);

  async function submit() {
    try {
      const r = await api<{ id: string; suggestListing: boolean }>("community/posts", { method: "POST", json: { type: newType, title, body } });
      setComposing(false); setTitle(""); setBody("");
      if (r.suggestListing) setError("Bài có vẻ đang rao bán — hãy đăng tin ở tab Đăng tin để bán an toàn hơn.");
      router.push(`/community/${r.id}`);
    } catch (e) { setError(errorText(e)); }
  }

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      data={items}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 4 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {TYPES.map(([v, l]) => <Chip key={v} label={l} active={type === v} onPress={() => setType(v)} />)}
          </ScrollView>
          {error && <Notice text={error} />}
          {me && !composing && <Button title="Đặt câu hỏi / Đăng bài" onPress={() => setComposing(true)} />}
          {composing && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>{TYPES.slice(1).map(([v, l]) => <Chip key={v} label={l} active={newType === v} onPress={() => setNewType(v)} />)}</View>
              <Field label="Tiêu đề" value={title} onChangeText={setTitle} />
              <Field label="Nội dung" value={body} onChangeText={setBody} multiline />
              <Button title="Đăng" onPress={submit} disabled={title.length < 5 || body.length < 10} />
              <Button title="Hủy" variant="secondary" onPress={() => setComposing(false)} />
            </View>
          )}
        </View>
      }
      renderItem={({ item: p }) => (
        <Pressable onPress={() => router.push(`/community/${p.id}`)} style={{ flexDirection: "row", gap: 10, backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontWeight: "700" }}>{p.title}</Text>
            <Text numberOfLines={2} style={s.muted}>{p.excerpt}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{p.author?.name} · {p.author?.badge}{p.author?.expert ? " · Chuyên gia" : ""} · ♥ {p.likes} · 💬 {p.comments}{p.answered ? " · ✓" : ""}</Text>
          </View>
          {p.thumbUrl && <Image source={{ uri: mediaUrl(p.thumbUrl) }} style={{ width: 64, height: 64, borderRadius: 8 }} />}
        </Pressable>
      )}
      ListEmptyComponent={<Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>Chưa có bài nào.</Text>}
    />
  );
}
