import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { mediaUrl } from "@/lib/config";
import type { Article } from "@/lib/types";
import { colors, s } from "./ui";

/** Mục Khám phá ở trang chủ: khu vực ảnh + khu vực nội dung của bài hôm nay. */
export function ExploreCard() {
  const [a, setA] = useState<Article | null>(null);
  useEffect(() => {
    let cancelled = false;
    api<Article | null>("explore/today", { auth: false }).then((r) => { if (!cancelled) setA(r); }, () => {});
    return () => { cancelled = true; };
  }, []);
  if (!a) return null;
  const cover = a.photos?.[0] ?? a.cover;
  const excerpt = (a.body ?? "").split(/\n\s*\n/)[0];
  return (
    <Pressable onPress={() => router.push(`/explore/${a.slug}`)} style={{ backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
      {cover && <Image source={{ uri: mediaUrl(cover.urls.card) }} style={{ width: "100%", aspectRatio: 16 / 9 }} contentFit="cover" />}
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#a16207", letterSpacing: 1 }}>KHÁM PHÁ HÔM NAY</Text>
        <Text style={s.h2}>{a.title}</Text>
        {a.summary ? <Text style={[s.muted, { fontStyle: "italic" }]}>{a.summary}</Text> : null}
        <Text numberOfLines={3} style={{ fontSize: 14, color: colors.text }}>{excerpt}</Text>
        <Text style={{ color: colors.green, fontWeight: "600" }}>Đọc tiếp →</Text>
      </View>
    </Pressable>
  );
}
