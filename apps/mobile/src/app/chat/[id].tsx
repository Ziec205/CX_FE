import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Button, colors, Notice, s } from "@/components/ui";
import { api, errorText, uploadPhoto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mediaUrl } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { createChatConnection } from "@/lib/realtime";
import type { Conv } from "../(tabs)/chats";

interface Msg {
  id: string; conversationId: string; senderId: string; type: "Text" | "Image" | "Location" | "Offer" | "System"; text?: string;
  mediaIds: string[]; offer?: { amount: number; status: string }; warning?: string; createdAt: string;
}
const OFFER_STATUS: Record<string, string> = { Pending: "Chờ phản hồi", Accepted: "Đã đồng ý", Rejected: "Đã từ chối", Countered: "Đã trả giá" };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useAuth();
  const [conv, setConv] = useState<Conv>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [offer, setOffer] = useState("");
  const [error, setError] = useState<string>();
  const list = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    api<Conv>(`conversations/${id}`).then(setConv, (e) => setError(errorText(e)));
    api<Msg[]>(`conversations/${id}/messages`).then((r) => setMsgs(r.reverse()), (e) => setError(errorText(e)));
    api(`conversations/${id}/read`, { method: "POST" }).catch(() => {});
    const hub = createChatConnection();
    hub.on("message", (m: Msg) => {
      if (m.conversationId !== id) return;
      // Có id rồi thì thay (vd đề nghị giá vừa đổi trạng thái), chưa có thì thêm.
      setMsgs((x) => (x.some((y) => y.id === m.id) ? x.map((y) => (y.id === m.id ? m : y)) : [...x, m]));
      api(`conversations/${id}/read`, { method: "POST" }).catch(() => {});
    });
    hub.start().catch(() => {});
    return () => { hub.stop(); };
  }, [id]);

  async function send(body: Record<string, unknown>) {
    try {
      const m = await api<Msg>(`conversations/${id}/messages`, { method: "POST", json: body });
      setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x, m]));
      setText(""); setOffer(""); setError(undefined);
    } catch (e) { setError(errorText(e)); }
  }
  async function sendPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (r.canceled) return;
    try { const p = await uploadPhoto(r.assets[0], false); await send({ type: "Image", mediaIds: [p.id] }); } catch (e) { setError(errorText(e)); }
  }
  async function respond(messageId: string, accept: boolean) {
    try {
      await api(`conversations/${id}/offers/${messageId}/respond`, { method: "POST", json: { accept, counterAmount: null } });
      setMsgs((await api<Msg[]>(`conversations/${id}/messages`)).reverse());
    } catch (e) { setError(errorText(e)); }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: conv?.listing.title ?? "Tin nhắn" }} />
      <FlatList ref={list} data={msgs} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: m }) => {
          const mine = m.senderId === me?.id;
          if (m.type === "System") return <Text style={[s.muted, { textAlign: "center", fontSize: 12 }]}>{m.text}</Text>;
          return (
            <View style={{ alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
              {m.warning && <View style={{ maxWidth: "85%" }}><Notice kind="warn" text={`⚠ ${m.warning}`} /></View>}
              <View style={{ maxWidth: "80%", borderRadius: 16, padding: 10, backgroundColor: mine ? colors.green : "#f0efee" }}>
                {m.type === "Text" && <Text style={{ color: mine ? "#fff" : colors.text }}>{m.text}</Text>}
                {m.type === "Image" && m.mediaIds.map((mid) => <Image key={mid} source={{ uri: mediaUrl(`/media/${mid}/card.webp`) }} style={{ width: 200, height: 200, borderRadius: 10 }} />)}
                {m.type === "Offer" && m.offer && (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: mine ? "#fff" : colors.text }}>💰 Đề nghị giá <Text style={{ fontWeight: "700" }}>{m.offer.amount.toLocaleString("vi-VN")}đ</Text></Text>
                    <Text style={{ color: mine ? "#d1fae5" : colors.muted, fontSize: 12 }}>{OFFER_STATUS[m.offer.status]}</Text>
                    {!mine && conv?.role === "seller" && m.offer.status === "Pending" && (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Button title="Đồng ý" onPress={() => respond(m.id, true)} />
                        <Button title="Từ chối" variant="secondary" onPress={() => respond(m.id, false)} />
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 10, color: colors.muted }}>{timeAgo(m.createdAt)}</Text>
            </View>
          );
        }} />
      {error && <View style={{ paddingHorizontal: 12 }}><Notice text={error} /></View>}
      {conv?.blocked ? <Text style={[s.muted, { textAlign: "center", padding: 12 }]}>Cuộc trò chuyện đã bị chặn</Text> : (
        <View style={{ padding: 10, gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
          {conv?.role === "buyer" && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={offer} onChangeText={setOffer} keyboardType="number-pad" placeholder="Đề nghị giá (đồng)" style={[s.input, { flex: 1 }]} />
              <Button title="Gửi giá" variant="secondary" disabled={!offer} onPress={() => send({ type: "Offer", offerAmount: Number(offer) })} />
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Pressable onPress={sendPhoto}><Text style={{ fontSize: 24 }}>📷</Text></Pressable>
            <TextInput value={text} onChangeText={setText} placeholder="Nhập tin nhắn…" style={[s.input, { flex: 1 }]} />
            <Button title="Gửi" disabled={!text.trim()} onPress={() => send({ type: "Text", text })} />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
