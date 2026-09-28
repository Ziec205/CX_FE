import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Button, Field, Notice, s } from "@/components/ui";
import { api, errorText, type TokenPair } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true); setError(undefined);
    try {
      const r = await api<{ devCode?: string }>("auth/otp/request", { method: "POST", json: { phone }, auth: false });
      setDevCode(r.devCode ?? null);
      setStep("code");
    } catch (e) { setError(errorText(e)); }
    setBusy(false);
  }

  async function verify() {
    setBusy(true); setError(undefined);
    try {
      const r = await api<{ tokens: TokenPair }>("auth/otp/verify", { method: "POST", json: { phone, code }, auth: false });
      await signIn(r.tokens);
      router.back();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.screen, { padding: 20, gap: 14 }]}>
      <Text style={s.h1}>Đăng nhập / Đăng ký</Text>
      <Text style={s.muted}>Chỉ cần số điện thoại. Người bán cá nhân không cần CCCD.</Text>
      {step === "phone" ? (
        <>
          <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="Số điện thoại, vd 0912 345 678" />
          {error && <Notice text={error} />}
          <Button title="Nhận mã OTP" onPress={request} loading={busy} disabled={phone.length < 9} />
        </>
      ) : (
        <View style={{ gap: 14 }}>
          <Text>Mã OTP đã gửi tới <Text style={{ fontWeight: "700" }}>{phone}</Text></Text>
          {devCode && <Notice kind="info" text={`Môi trường phát triển — mã OTP: ${devCode}`} />}
          <Field value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} placeholder="Mã 6 số"
            style={{ textAlign: "center", fontSize: 22, letterSpacing: 8 }} />
          {error && <Notice text={error} />}
          <Button title="Xác nhận" onPress={verify} loading={busy} disabled={code.length !== 6} />
          <Button title="Đổi số điện thoại" variant="secondary" onPress={() => setStep("phone")} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
