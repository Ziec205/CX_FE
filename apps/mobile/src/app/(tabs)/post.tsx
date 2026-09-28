import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { ProvincePicker } from "@/components/ProvincePicker";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, Chip, colors, Field, Notice, s } from "@/components/ui";
import { api, errorText, uploadPhoto, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import type { AttributeDefinition, Category, CategoryTree, Me, Species } from "@/lib/types";

type ListingType = "Sell" | "Buy" | "Rent" | "Give";
const TYPES: [ListingType, string][] = [["Sell", "Bán"], ["Buy", "Cần mua"], ["Rent", "Cho thuê"], ["Give", "Tặng"]];
interface Photo { id: string; uri: string }

export default function PostScreen() {
  const { me, setMe } = useAuth();
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [type, setType] = useState<ListingType>("Sell");
  const [categoryId, setCategoryId] = useState("");
  const [category, setCategory] = useState<Category>();
  const [speciesQ, setSpeciesQ] = useState("");
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [species, setSpecies] = useState<{ id: string; name: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [attrs, setAttrs] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [provinceId, setProvinceId] = useState(me?.provinceId ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>();
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { api<CategoryTree[]>("categories", { auth: false }).then(setTree, () => {}); }, []);
  useEffect(() => {
    if (!categoryId) return;
    api<Category>(`categories/${categoryId}`, { auth: false }).then((c) => { setCategory(c); setAttrs({}); }, () => {});
  }, [categoryId]);
  useEffect(() => {
    if (!categoryId || species) return;
    const t = setTimeout(() => api<Species[]>(`species?categoryId=${categoryId}&q=${encodeURIComponent(speciesQ)}&limit=8`, { auth: false }).then(setSpeciesList, () => {}), 250);
    return () => clearTimeout(t);
  }, [speciesQ, categoryId, species]);

  if (!me) return <SignInPrompt text="Đăng nhập để đăng tin — miễn phí, không giới hạn" />;
  if (!me.canPost) return <ProfileStep me={me} onDone={(m) => { setMe(m); setProvinceId(m.provinceId ?? ""); }} />;

  const minPhotos = type === "Buy" ? 0 : category?.isLivePlant ? 3 : 1;

  async function addPhotos(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Bạn chưa cấp quyền " + (fromCamera ? "camera" : "thư viện ảnh"));
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 12 - photos.length, quality: 0.8 });
    if (result.canceled) return;
    setUploading((n) => n + result.assets.length);
    for (const a of result.assets) {
      try {
        const r = await uploadPhoto(a, fromCamera); // ảnh chụp trong app → nhãn "Ảnh chụp thực tế"
        setPhotos((p) => [...p, { id: r.id, uri: mediaUrl(r.urls?.thumb) ?? a.uri }]);
      } catch (e) { setError(errorText(e)); }
      setUploading((n) => n - 1);
    }
  }

  async function locate() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return setError("Bạn chưa cho phép truy cập vị trí");
    const p = await Location.getCurrentPositionAsync({});
    setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
  }

  async function submit() {
    setError(undefined);
    const problems: string[] = [];
    if (!categoryId) problems.push("Chọn danh mục");
    if (category?.isLivePlant && type !== "Buy" && !species) problems.push("Chọn loài cây (hoặc Khác / không rõ)");
    if (photos.length < minPhotos) problems.push(`Cần ít nhất ${minPhotos} ảnh`);
    if (!provinceId) problems.push("Chọn tỉnh / thành");
    if (problems.length) return setError(problems.join("\n"));
    setBusy(true);
    const n = (v: string) => (v ? Number(v) : null);
    try {
      const r = await api<{ id: string; status: string; rejectReason?: string }>("listings", { method: "POST", json: { submit: true, listing: {
        type, categoryId, speciesId: species?.id ?? null, title, description,
        price: type === "Sell" ? n(price) : type === "Give" ? 0 : null,
        budgetMax: type === "Buy" ? n(budgetMax) : null,
        rent: type === "Rent" ? { unit: "Month", pricePerUnit: Number(rentPrice), deposit: 0, minUnits: 1 } : null,
        quantity: Number(quantity) || 1, attributes: attrs, provinceId, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        pickupOptions: ["PICKUP"], mediaIds: photos.map((p) => p.id),
      } } });
      reset();
      if (r.status === "Active") router.push(`/listing/${r.id}`);
      else setError(r.status === "PendingReview" ? "Tin đã gửi và đang chờ duyệt." : `Tin chưa được duyệt: ${r.rejectReason ?? ""}`);
    } catch (e) {
      const d = (e as ApiError).details;
      setError(Array.isArray(d) ? d.map((x) => (x as { message: string }).message).join("\n") : errorText(e));
    }
    setBusy(false);
  }

  function reset() {
    setTitle(""); setDescription(""); setPrice(""); setPhotos([]); setAttrs({}); setSpecies(undefined); setSpeciesQ("");
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.h2}>Loại tin</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {TYPES.map(([v, l]) => <Chip key={v} label={l} active={type === v} onPress={() => setType(v)} />)}
        </View>
      </Card>

      <Card>
        <Text style={s.h2}>Danh mục</Text>
        {tree.map((root) => (
          <View key={root.id} style={{ gap: 6 }}>
            <Text style={s.muted}>{root.name}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {root.children.map((c) => <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => { setCategoryId(c.id); setSpecies(undefined); }} />)}
            </View>
          </View>
        ))}
        {category?.requiresManualReview && <Notice kind="warn" text="Hàng hạn chế: tin sẽ được người duyệt kiểm tra giấy tờ." />}
      </Card>

      {category?.isLivePlant && (
        <Card>
          <Text style={s.h2}>Loài cây</Text>
          {species ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Chip label={species.name} active />
              <Pressable onPress={() => setSpecies(undefined)}><Text style={{ color: colors.green }}>đổi</Text></Pressable>
            </View>
          ) : (
            <>
              <Field value={speciesQ} onChangeText={setSpeciesQ} placeholder="Gõ tên cây, vd: kim tiền" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {speciesList.map((sp) => <Chip key={sp.id} label={sp.commonName} onPress={() => setSpecies({ id: sp.id, name: sp.commonName })} />)}
                <Chip label="Khác / không rõ" onPress={() => setSpecies({ id: "khac", name: "Khác / không rõ" })} />
              </View>
            </>
          )}
        </Card>
      )}

      <Card>
        <Field label="Tiêu đề" required value={title} onChangeText={setTitle} maxLength={70} hint="10–70 ký tự, không ghi số điện thoại" />
        <Field label="Mô tả" required value={description} onChangeText={setDescription} multiline maxLength={3000} hint="Không ghi SĐT/link — người mua liên hệ qua chat" />
        {type === "Sell" && <Field label="Giá (đồng)" required value={price} onChangeText={setPrice} keyboardType="number-pad" />}
        {type === "Buy" && <Field label="Ngân sách tối đa (đồng)" value={budgetMax} onChangeText={setBudgetMax} keyboardType="number-pad" />}
        {type === "Rent" && <Field label="Giá thuê / tháng (đồng)" required value={rentPrice} onChangeText={setRentPrice} keyboardType="number-pad" />}
        <Field label="Số lượng" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
        {category?.attributes.map((a) => (
          <AttributeInput key={a.key} def={a} required={a.required && type !== "Buy"} value={attrs[a.key]} onChange={(v) => setAttrs({ ...attrs, [a.key]: v })} />
        ))}
      </Card>

      {type !== "Buy" && (
        <Card>
          <Text style={s.h2}>Ảnh ({photos.length}/12)</Text>
          <Text style={s.muted}>Tối thiểu {minPhotos} ảnh. Ảnh chụp bằng nút 📷 được gắn nhãn “Ảnh chụp thực tế”.</Text>
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {photos.map((p, i) => (
              <Pressable key={p.id} onLongPress={() => setPhotos(photos.filter((x) => x.id !== p.id))}>
                <Image source={{ uri: p.uri }} style={{ width: 84, height: 84, borderRadius: 8 }} />
                {i === 0 && <Text style={{ position: "absolute", left: 4, top: 4, backgroundColor: colors.green, color: "#fff", fontSize: 10, paddingHorizontal: 4, borderRadius: 3 }}>Bìa</Text>}
              </Pressable>
            ))}
            {uploading > 0 && <View style={{ width: 84, height: 84, borderRadius: 8, backgroundColor: "#f5f5f4", justifyContent: "center" }}><Text style={[s.muted, { textAlign: "center" }]}>Đang tải…</Text></View>}
          </ScrollView>
          <Text style={s.hint}>Nhấn giữ ảnh để xóa.</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="📷 Chụp ảnh" onPress={() => addPhotos(true)} style={{ flex: 1 }} />
            <Button title="🖼️ Thư viện" variant="secondary" onPress={() => addPhotos(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      <Card>
        <Text style={s.h2}>Khu vực</Text>
        <ProvincePicker value={provinceId} onChange={setProvinceId} />
        <Button title={coords ? `📍 ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "📍 Dùng vị trí hiện tại"} variant="secondary" onPress={locate} />
        <Text style={s.hint}>Người bán cá nhân: vị trí được làm tròn ~1 km để bảo vệ địa chỉ nhà.</Text>
      </Card>

      {error && <Notice text={error} />}
      <Button title="Đăng tin" onPress={submit} loading={busy} disabled={uploading > 0} />
    </ScrollView>
  );
}

function AttributeInput({ def, value, required, onChange }: { def: AttributeDefinition; value: unknown; required: boolean; onChange: (v: unknown) => void }) {
  const label = `${def.label}${def.unit ? ` (${def.unit})` : ""}`;
  if (def.type === "Boolean")
    return <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text>{def.label}</Text><Switch value={!!value} onValueChange={onChange} /></View>;
  if (def.type === "SingleSelect" || def.type === "MultiSelect") {
    const arr = def.type === "MultiSelect" ? ((value as string[]) ?? []) : [];
    return (
      <View style={{ gap: 6 }}>
        <Text style={s.label}>{label}{required && <Text style={{ color: colors.red }}> *</Text>}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {def.options.map((o) => {
            const active = def.type === "MultiSelect" ? arr.includes(o) : value === o;
            return <Chip key={o} label={o} active={active} onPress={() => onChange(def.type === "MultiSelect" ? (active ? arr.filter((x) => x !== o) : [...arr, o]) : active ? undefined : o)} />;
          })}
        </View>
      </View>
    );
  }
  return <Field label={label} required={required} value={value == null ? "" : String(value)} keyboardType={def.type === "Number" ? "decimal-pad" : "default"}
    onChangeText={(t) => onChange(t === "" ? undefined : def.type === "Number" ? Number(t.replace(",", ".")) : t)} />;
}

function ProfileStep({ me, onDone }: { me: Me; onDone: (m: Me) => void }) {
  const [fullName, setFullName] = useState(me.fullName ?? "");
  const [provinceId, setProvinceId] = useState(me.provinceId ?? "");
  const [error, setError] = useState<string>();
  const save = async () => {
    try { onDone(await api<Me>("me", { method: "PUT", json: { fullName, provinceId } })); } catch (e) { setError(errorText(e)); }
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.h2}>Hoàn tất thông tin người bán</Text>
      <Text style={s.muted}>Chỉ cần họ tên và tỉnh/thành — không cần CCCD. Họ tên không hiển thị công khai.</Text>
      <Field label="Họ và tên" required value={fullName} onChangeText={setFullName} />
      <ProvincePicker value={provinceId} onChange={setProvinceId} />
      {error && <Notice text={error} />}
      <Button title="Lưu và tiếp tục" onPress={save} disabled={!fullName || !provinceId} />
    </ScrollView>
  );
}
