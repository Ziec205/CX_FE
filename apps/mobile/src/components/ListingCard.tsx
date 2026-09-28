import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { mediaUrl } from "@/lib/config";
import { priceLabel, timeAgo, TYPE_LABEL } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import type { ListingCard as Card } from "@/lib/types";
import { colors, s } from "./ui";

export function ListingCard({ l }: { l: Card }) {
  return (
    <Pressable onPress={() => router.push(`/listing/${l.id}`)}
      style={{ flex: 1, backgroundColor: colors.white, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: l.isPriority ? "#fcd34d" : colors.border }}>
      <View style={{ aspectRatio: 1, backgroundColor: "#f5f5f4" }}>
        {l.thumbUrl ? <Image source={{ uri: mediaUrl(l.thumbUrl) }} style={{ flex: 1 }} contentFit="cover" transition={150} />
          : <Text style={{ fontSize: 40, textAlign: "center", marginTop: 50 }}>🌱</Text>}
        <View style={{ position: "absolute", top: 6, left: 6, flexDirection: "row", gap: 4 }}>
          {l.isPriority && <Tag text="Ưu tiên" bg="#fbbf24" />}
          {l.type !== "Sell" && <Tag text={TYPE_LABEL[l.type]} bg="#0284c7" fg="#fff" />}
        </View>
      </View>
      <View style={{ padding: 8, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "500", minHeight: 34 }}>{l.title}</Text>
        <Text style={[s.price, { fontSize: 14 }]}>{priceLabel(l)}</Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>
          {l.seller.isGarden ? "✔ Nhà vườn · " : ""}{l.escrow ? "🛡 · " : ""}{provinceName(l.provinceId)}{l.distanceKm != null ? ` · ${l.distanceKm} km` : ""}
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>{timeAgo(l.bumpedAt)}</Text>
      </View>
    </Pressable>
  );
}

function Tag({ text, bg, fg = "#451a03" }: { text: string; bg: string; fg?: string }) {
  return <Text style={{ backgroundColor: bg, color: fg, fontSize: 10, fontWeight: "600", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: "hidden" }}>{text}</Text>;
}
