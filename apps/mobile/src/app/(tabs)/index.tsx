import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ExploreCard } from "@/components/ExploreCard";
import { ListingCard } from "@/components/ListingCard";
import { Chip, colors, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import type { CategoryTree, ListingCard as Card, SearchResult } from "@/lib/types";

const TYPES: [string, string][] = [["", "Tất cả"], ["Sell", "Bán"], ["Buy", "Cần mua"], ["Rent", "Cho thuê"], ["Give", "Tặng"]];

export default function HomeScreen() {
  const { speciesId } = useLocalSearchParams<{ speciesId?: string }>();
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [type, setType] = useState("");
  const [rootCategoryId, setRoot] = useState("");
  const [near, setNear] = useState<{ lat: number; lng: number }>();
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [items, setItems] = useState<Card[]>([]);
  const [priority, setPriority] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchPage = useCallback((p: number) => {
    const qs = new URLSearchParams({ page: String(p), pageSize: "20" });
    if (submittedQ) qs.set("q", submittedQ);
    if (type) qs.set("type", type);
    if (rootCategoryId) qs.set("rootCategoryId", rootCategoryId);
    if (speciesId) qs.set("speciesId", speciesId);
    if (near) { qs.set("lat", String(near.lat)); qs.set("lng", String(near.lng)); qs.set("radiusKm", "20"); qs.set("sort", "Nearest"); }
    return api<SearchResult>(`listings?${qs}`, { auth: false });
  }, [submittedQ, type, rootCategoryId, near, speciesId]);

  const apply = (r: SearchResult, p: number) => {
    setItems((x) => (p === 1 ? r.items : [...x, ...r.items]));
    if (p === 1) setPriority(r.priority);
    setTotal(r.total);
    setPage(p);
    setError(undefined);
  };

  // Dùng cho kéo để tải lại và cuộn tải thêm (sự kiện người dùng).
  const load = async (p: number) => {
    setLoading(true);
    try { apply(await fetchPage(p), p); } catch (e) { setError(errorText(e)); }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetchPage(1).then((r) => { if (!cancelled) apply(r, 1); }, (e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [fetchPage]);
  useEffect(() => { api<CategoryTree[]>("categories", { auth: false }).then(setCategories, () => {}); }, []);

  async function toggleNear() {
    if (near) return setNear(undefined);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return setError("Bạn chưa cho phép truy cập vị trí");
    const pos = await Location.getCurrentPositionAsync({});
    setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  const header = (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setSubmittedQ(q.trim())} returnKeyType="search"
        placeholder="Tìm cây, chậu, vật tư… (không dấu cũng được)" placeholderTextColor={colors.muted}
        style={[s.input, { borderRadius: 999 }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label={near ? "📍 Gần tôi ✓" : "📍 Gần tôi"} active={!!near} onPress={toggleNear} />
        {TYPES.map(([v, l]) => <Chip key={v} label={l} active={type === v} onPress={() => setType(v)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="Mọi danh mục" active={!rootCategoryId} onPress={() => setRoot("")} />
        {categories.map((c) => <Chip key={c.id} label={c.name} active={rootCategoryId === c.id} onPress={() => setRoot(c.id)} />)}
      </ScrollView>
      {!submittedQ && !type && !rootCategoryId && !speciesId && <ExploreCard />}
      {error && <Notice text={error} />}
      {priority.length > 0 && (
        <View style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 8, gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.amberText }}>TIN ƯU TIÊN</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {priority.slice(0, 2).map((l) => <ListingCard key={l.id} l={l} />)}
            {priority.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        </View>
      )}
      <Text style={s.muted}>{total.toLocaleString("vi-VN")} tin{submittedQ ? ` cho “${submittedQ}”` : ""}</Text>
    </View>
  );

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      columnWrapperStyle={{ gap: 8 }}
      data={items}
      numColumns={2}
      keyExtractor={(l) => l.id}
      renderItem={({ item, index }) => (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <ListingCard l={item} />
          {index === items.length - 1 && items.length % 2 === 1 && <View style={{ flex: 1 }} />}
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={loading ? null : <Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>Không có tin phù hợp.</Text>}
      ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} color={colors.green} /> : null}
      onEndReached={() => { if (!loading && items.length < total) load(page + 1); }}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={loading && page === 1} onRefresh={() => load(1)} />}
    />
  );
}
