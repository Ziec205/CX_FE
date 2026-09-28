import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, colors, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { mediaUrl } from "@/lib/config";
import type { Article } from "@/lib/types";

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [a, setA] = useState<Article>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    api<Article>(`explore/${slug}`, { auth: false }).then((r) => { if (!cancelled) setA(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [slug]);

  if (!a) return <View style={[s.screen, { padding: 14 }]}>{error && <Notice text={error} />}</View>;
  const [cover, ...rest] = a.photos ?? [];
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
      <Stack.Screen options={{ title: "Khám phá" }} />
      {cover && <Image source={{ uri: mediaUrl(cover.urls.full) }} style={{ width: "100%", aspectRatio: 4 / 3 }} contentFit="cover" />}
      <View style={{ paddingHorizontal: 14, gap: 10 }}>
        <Text style={s.muted}>{a.publishAt && new Date(a.publishAt).toLocaleDateString("vi-VN")}</Text>
        <Text style={[s.h1, { color: colors.greenDark }]}>{a.title}</Text>
        {a.summary ? <Text style={{ fontStyle: "italic", color: colors.muted, fontSize: 16 }}>{a.summary}</Text> : null}
        {(a.body ?? "").split(/\n\s*\n/).filter(Boolean).map((p, i) => <Text key={i} style={{ fontSize: 16, lineHeight: 24, color: colors.text }}>{p}</Text>)}
        {rest.map((m) => <Image key={m.id} source={{ uri: mediaUrl(m.urls.card) }} style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }} />)}
        {a.speciesId && <Button title="Xem tin đang bán loài này" variant="secondary" onPress={() => router.push({ pathname: "/", params: { speciesId: a.speciesId! } })} />}
      </View>
    </ScrollView>
  );
}
