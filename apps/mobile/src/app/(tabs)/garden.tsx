import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, Chip, colors, Field, Notice, s } from "@/components/ui";
import { api, errorText, uploadPhoto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import type { CareReminder, MyPlant, ReminderKind, ReminderRepeat } from "@/lib/types";

const KIND: Record<ReminderKind, string> = { Watering: "💧 Tưới cây", Fertilizing: "🌱 Bón phân", Pruning: "✂️ Cắt tỉa", Repotting: "🪴 Thay chậu", Other: "🌿 Chăm cây" };
const REPEAT: [ReminderRepeat, string][] = [["None", "Không lặp"], ["Daily", "Hằng ngày"], ["Weekly", "Hằng tuần"], ["Monthly", "Hằng tháng"], ["Yearly", "Hằng năm"]];
const UNIT: Record<ReminderRepeat, string> = { None: "", Daily: "ngày", Weekly: "tuần", Monthly: "tháng", Yearly: "năm" };

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const repeatText = (r: CareReminder) => (r.repeat === "None" ? "Một lần" : r.interval > 1 ? `Mỗi ${r.interval} ${UNIT[r.repeat]}` : REPEAT.find(([k]) => k === r.repeat)?.[1]);

export default function GardenScreen() {
  const { me } = useAuth();
  const [plants, setPlants] = useState<MyPlant[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string }>();
  const [form, setForm] = useState<MyPlant | "new">();
  const [reminderFor, setReminderFor] = useState<{ plant: MyPlant; reminder?: CareReminder }>();

  const load = useCallback(() => {
    if (!me) return;
    api<MyPlant[]>("me/garden/plants").then(setPlants, (e) => setMsg({ kind: "err", text: errorText(e) }));
  }, [me]);
  useFocusEffect(load);

  if (!me) return <SignInPrompt text="Đăng nhập để lưu cây bạn đang trồng và đặt lịch nhắc tưới" />;

  if (form) return <PlantForm plant={form === "new" ? undefined : form} onDone={() => { setForm(undefined); load(); }} />;
  if (reminderFor) return <ReminderForm plant={reminderFor.plant} reminder={reminderFor.reminder} onDone={() => { setReminderFor(undefined); load(); }} />;

  const upcoming = plants.flatMap((p) => p.reminders.filter((r) => r.enabled && r.nextAt).map((r) => ({ ...r, plantName: p.name })))
    .sort((a, b) => new Date(a.nextAt!).getTime() - new Date(b.nextAt!).getTime()).slice(0, 5);

  function plantMenu(p: MyPlant) {
    Alert.alert(p.name, undefined, [
      { text: "⏰ Đặt lời nhắc", onPress: () => setReminderFor({ plant: p }) },
      { text: "Sửa thông tin", onPress: () => setForm(p) },
      { text: "Xóa cây", style: "destructive", onPress: () => api(`me/garden/plants/${p.id}`, { method: "DELETE" }).then(load, (e) => setMsg({ kind: "err", text: errorText(e) })) },
      { text: "Đóng", style: "cancel" },
    ]);
  }
  function reminderMenu(p: MyPlant, r: CareReminder) {
    Alert.alert(KIND[r.kind], `${repeatText(r)} · lần tới ${when(r.nextAt)}`, [
      { text: "Sửa", onPress: () => setReminderFor({ plant: p, reminder: r }) },
      { text: "Xóa", style: "destructive", onPress: () => api(`me/garden/plants/${p.id}/reminders/${r.id}`, { method: "DELETE" }).then(load, (e) => setMsg({ kind: "err", text: errorText(e) })) },
      { text: "Đóng", style: "cancel" },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Button title="+ Thêm cây vào vườn" onPress={() => setForm("new")} />
      {msg && <Notice kind={msg.kind} text={msg.text} />}
      {upcoming.length > 0 && (
        <Card>
          <Text style={s.h2}>Sắp tới</Text>
          {upcoming.map((r) => (
            <View key={r.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ flex: 1 }} numberOfLines={1}>{KIND[r.kind]} · {r.plantName}</Text>
              <Text style={{ color: colors.greenDark, fontSize: 13 }}>{when(r.nextAt)}</Text>
            </View>
          ))}
        </Card>
      )}
      {plants.length === 0 && <Text style={[s.muted, { textAlign: "center", marginTop: 24 }]}>Vườn của bạn chưa có cây nào.</Text>}
      {plants.map((p) => (
        <Card key={p.id}>
          <Pressable onPress={() => plantMenu(p)} style={{ flexDirection: "row", gap: 12 }}>
            {p.photos[0]
              ? <Image source={{ uri: mediaUrl(p.photos[0].urls.card) }} style={{ width: 72, height: 72, borderRadius: 10 }} />
              : <View style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 28 }}>🌿</Text></View>}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.h2}>{p.name}</Text>
              <Text style={s.muted}>{[p.speciesName, p.location].filter(Boolean).join(" · ")}</Text>
              {p.note && <Text numberOfLines={2} style={{ fontSize: 13 }}>{p.note}</Text>}
            </View>
          </Pressable>
          {p.reminders.map((r) => (
            <Pressable key={r.id} onPress={() => reminderMenu(p, r)} style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, opacity: r.enabled ? 1 : 0.5 }}>
              <Text style={{ fontWeight: "600" }}>{KIND[r.kind]} · {repeatText(r)}</Text>
              <Text style={s.muted}>{r.enabled && r.nextAt ? `Lần tới: ${when(r.nextAt)}` : "Đang tắt"}{r.note ? ` · ${r.note}` : ""}</Text>
            </Pressable>
          ))}
          <Button title="⏰ Đặt lời nhắc" variant="secondary" onPress={() => setReminderFor({ plant: p })} />
        </Card>
      ))}
    </ScrollView>
  );
}

function PlantForm({ plant, onDone }: { plant?: MyPlant; onDone: () => void }) {
  const [name, setName] = useState(plant?.name ?? "");
  const [location, setLocation] = useState(plant?.location ?? "");
  const [note, setNote] = useState(plant?.note ?? "");
  const [photos, setPhotos] = useState<{ id: string; uri: string }[]>(plant?.photos.map((m) => ({ id: m.id, uri: mediaUrl(m.urls.thumb)! })) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pick(camera: boolean) {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Bạn chưa cấp quyền truy cập ảnh");
    const r = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (r.canceled) return;
    try {
      const up = await uploadPhoto(r.assets[0], camera, "PlantPhoto");
      setPhotos((p) => [...p, { id: up.id, uri: r.assets[0].uri }]);
    } catch (e) { setError(errorText(e)); }
  }

  async function save() {
    setBusy(true); setError(undefined);
    try {
      await api(plant ? `me/garden/plants/${plant.id}` : "me/garden/plants", {
        method: plant ? "PUT" : "POST",
        json: { name, speciesId: plant?.speciesId ?? null, location: location || null, note: note || null, mediaIds: photos.map((p) => p.id) },
      });
      onDone();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Text style={s.h1}>{plant ? "Sửa cây" : "Thêm cây"}</Text>
      <Field label="Tên gọi" required value={name} onChangeText={setName} placeholder="Vd: Trầu bà phòng khách" />
      <Field label="Vị trí đặt" value={location} onChangeText={setLocation} placeholder="Ban công, sân thượng…" />
      <Field label="Ghi chú" value={note} onChangeText={setNote} multiline />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.map((p) => (
          <Pressable key={p.id} onLongPress={() => setPhotos(photos.filter((x) => x.id !== p.id))}>
            <Image source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: 8 }} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="📷 Chụp ảnh" variant="secondary" onPress={() => pick(true)} style={{ flex: 1 }} />
        <Button title="🖼 Thư viện" variant="secondary" onPress={() => pick(false)} style={{ flex: 1 }} />
      </View>
      {error && <Notice text={error} />}
      <Button title="Lưu" onPress={save} loading={busy} disabled={!name.trim()} />
      <Button title="Hủy" variant="secondary" onPress={onDone} />
    </ScrollView>
  );
}

function ReminderForm({ plant, reminder, onDone }: { plant: MyPlant; reminder?: CareReminder; onDone: () => void }) {
  const start = reminder?.nextAt ? new Date(reminder.nextAt) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); return d; })();
  const [kind, setKind] = useState<ReminderKind>(reminder?.kind ?? "Watering");
  const [hour, setHour] = useState(String(start.getHours()));
  const [minute, setMinute] = useState(String(start.getMinutes()).padStart(2, "0"));
  const [day, setDay] = useState(String(start.getDate()));
  const [month, setMonth] = useState(String(start.getMonth() + 1));
  const [year, setYear] = useState(String(start.getFullYear()));
  const [repeat, setRepeat] = useState<ReminderRepeat>(reminder?.repeat ?? "Daily");
  const [every, setEvery] = useState(String(reminder?.interval ?? 1));
  const [note, setNote] = useState(reminder?.note ?? "");
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save() {
    const at = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (Number.isNaN(at.getTime()) || at.getDate() !== Number(day)) return setError("Ngày giờ không hợp lệ");
    setBusy(true); setError(undefined);
    try {
      await api(reminder ? `me/garden/plants/${plant.id}/reminders/${reminder.id}` : `me/garden/plants/${plant.id}/reminders`, {
        method: reminder ? "PUT" : "POST",
        json: { kind, at: at.toISOString(), repeat, interval: repeat === "None" ? 1 : Math.max(1, Number(every) || 1), note: note || null, enabled },
      });
      onDone();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  const num = { keyboardType: "number-pad" as const, style: { textAlign: "center" as const } };
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Text style={s.h1}>Lời nhắc cho {plant.name}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(Object.keys(KIND) as ReminderKind[]).map((k) => <Chip key={k} label={KIND[k]} active={kind === k} onPress={() => setKind(k)} />)}
      </View>
      <Text style={s.label}>Giờ – ngày – tháng – năm</Text>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}><Field label="Giờ" value={hour} onChangeText={setHour} maxLength={2} {...num} /></View>
        <View style={{ flex: 1 }}><Field label="Phút" value={minute} onChangeText={setMinute} maxLength={2} {...num} /></View>
        <View style={{ flex: 1 }}><Field label="Ngày" value={day} onChangeText={setDay} maxLength={2} {...num} /></View>
        <View style={{ flex: 1 }}><Field label="Tháng" value={month} onChangeText={setMonth} maxLength={2} {...num} /></View>
        <View style={{ flex: 1.4 }}><Field label="Năm" value={year} onChangeText={setYear} maxLength={4} {...num} /></View>
      </View>
      <Text style={s.label}>Lặp lại</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {REPEAT.map(([k, l]) => <Chip key={k} label={l} active={repeat === k} onPress={() => setRepeat(k)} />)}
      </View>
      {repeat !== "None" && <Field label={`Cứ mỗi … ${UNIT[repeat]}`} value={every} onChangeText={setEvery} keyboardType="number-pad" />}
      <Field label="Ghi chú" value={note} onChangeText={setNote} placeholder="Vd: tưới 200ml" />
      {reminder && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={s.label}>Bật lời nhắc</Text>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.green }} />
        </View>
      )}
      {error && <Notice text={error} />}
      <Button title="Lưu lời nhắc" onPress={save} loading={busy} />
      <Button title="Hủy" variant="secondary" onPress={onDone} />
    </ScrollView>
  );
}
