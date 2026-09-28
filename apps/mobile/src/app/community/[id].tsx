import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, colors, Field, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import type { MediaDto } from "@/lib/types";

interface Author { id: string; name: string; badge: string; points: number; expert: boolean }
interface Detail {
  post: { id: string; type: string; title: string; body: string; likes: number; liked: boolean; bestCommentId?: string | null; photos: MediaDto[]; author?: Author; createdAt: string };
  comments: { id: string; body: string; likes: number; liked: boolean; isBest: boolean; author?: Author; createdAt: string }[];
}

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useAuth();
  const [d, setD] = useState<Detail>();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(() => { api<Detail>(`community/posts/${id}`).then(setD, (e) => setError(errorText(e))); }, [id]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>) { try { await fn(); load(); } catch (e) { setError(errorText(e)); } }

  if (!d) return <View style={[s.screen, { padding: 14 }]}>{error && <Notice text={error} />}</View>;
  const p = d.post;
  const mine = me?.id === p.author?.id;
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      {error && <Notice text={error} />}
      <Card>
        <Text style={s.h1}>{p.title}</Text>
        <Text style={s.muted}>{p.author?.name} · {p.author?.badge}{p.author?.expert ? " · Chuyên gia" : ""}</Text>
        <Text style={{ fontSize: 15, lineHeight: 22 }}>{p.body}</Text>
        {p.photos.map((m) => <Image key={m.id} source={{ uri: mediaUrl(m.urls.card) }} style={{ width: "100%", aspectRatio: 1, borderRadius: 10 }} />)}
        <Pressable onPress={() => me && run(() => api(`community/posts/${p.id}/like`, { method: p.liked ? "DELETE" : "PUT" }))}>
          <Text style={{ color: p.liked ? colors.rose : colors.muted, fontWeight: "600" }}>♥ {p.likes}</Text>
        </Pressable>
      </Card>
      <Text style={s.h2}>{p.type === "Question" ? "Câu trả lời" : "Bình luận"} ({d.comments.length})</Text>
      {d.comments.map((c) => (
        <Card key={c.id} style={c.isBest ? { borderColor: colors.green, borderWidth: 2 } : undefined}>
          {c.isBest && <Text style={{ color: colors.greenDark, fontWeight: "700" }}>✓ Hay nhất</Text>}
          <Text style={s.muted}>{c.author?.name} · {c.author?.badge}{c.author?.expert ? " · Chuyên gia" : ""}</Text>
          <Text>{c.body}</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Pressable onPress={() => me && run(() => api(`community/comments/${c.id}/like`, { method: c.liked ? "DELETE" : "PUT" }))}>
              <Text style={{ color: c.liked ? colors.rose : colors.muted }}>♥ {c.likes}</Text>
            </Pressable>
            {mine && p.type === "Question" && !p.bestCommentId && c.author?.id !== me?.id && (
              <Pressable onPress={() => run(() => api(`community/posts/${p.id}/best/${c.id}`, { method: "POST" }))}><Text style={{ color: colors.green }}>Chọn hay nhất</Text></Pressable>
            )}
          </View>
        </Card>
      ))}
      {me ? (
        <View style={{ gap: 8 }}>
          <Field value={text} onChangeText={setText} multiline placeholder={p.type === "Question" ? "Chia sẻ cách xử lý của bạn…" : "Viết bình luận…"} />
          <Button title="Gửi" disabled={!text.trim()} onPress={() => run(async () => { await api(`community/posts/${p.id}/comments`, { method: "POST", json: { body: text } }); setText(""); })} />
        </View>
      ) : <Text style={s.muted}>Đăng nhập để trả lời.</Text>}
    </ScrollView>
  );
}
