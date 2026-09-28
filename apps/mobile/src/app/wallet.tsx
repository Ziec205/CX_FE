import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, colors, Notice, s } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import type { PublicPricing } from "@/lib/types";

interface Wallet { balance: number; paid: number; bonus: number }
interface Entry { id: string; amount: number; type: string; note?: string; createdAt: string }
interface TopUp { snapshot: { priceVnd: number; xu: number }; transferContent: string; bankAccountName: string }

export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet>();
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [pricing, setPricing] = useState<PublicPricing>();
  const [topUp, setTopUp] = useState<TopUp>();
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    Promise.all([api<Wallet>("wallet"), api<Entry[]>("wallet/ledger"), api<PublicPricing>("pricing/current", { auth: false })])
      .then(([w, l, p]) => { setWallet(w); setLedger(l); setPricing(p); }, (e) => setError(errorText(e)));
  }, []);
  useEffect(load, [load]);

  async function start(code: string) {
    if (!pricing) return;
    try { setTopUp(await api<TopUp>("wallet/topups", { method: "POST", json: { packageCode: code, expectedPriceBookVersion: pricing.version } })); }
    catch (e) { setError(errorText(e)); }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, gap: 12 }}>
      {wallet && (
        <View style={{ backgroundColor: colors.green, borderRadius: 16, padding: 18 }}>
          <Text style={{ color: "#d1fae5" }}>Số dư</Text>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700" }}>{wallet.balance.toLocaleString("vi-VN")} Xu</Text>
          <Text style={{ color: "#d1fae5", fontSize: 12 }}>Xu nạp {wallet.paid} · Xu thưởng {wallet.bonus} · 1 Xu = 1.000đ</Text>
        </View>
      )}
      {error && <Notice text={error} />}
      <Card>
        <Text style={s.h2}>Nạp Xu</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {pricing?.topUpPackages.map((p) => (
            <Pressable key={p.code} onPress={() => start(p.code)} style={{ width: "48%", borderWidth: 1, borderColor: p.popular ? colors.green : colors.border, borderRadius: 12, padding: 10 }}>
              <Text style={{ fontWeight: "700" }}>{p.name}{p.popular ? " ⭐" : ""}</Text>
              <Text>{p.priceVnd.toLocaleString("vi-VN")}đ</Text>
              <Text style={{ color: colors.greenDark, fontSize: 12 }}>{p.xu} Xu{p.bonusXu ? ` + ${p.bonusXu} thưởng` : ""}</Text>
            </Pressable>
          ))}
        </View>
        {topUp && (
          <Notice kind="info" text={`Chuyển ${topUp.snapshot.priceVnd.toLocaleString("vi-VN")}đ tới ${topUp.bankAccountName}\nNội dung: ${topUp.transferContent}\nXu được cộng tự động khi ngân hàng xác nhận.`} />
        )}
      </Card>
      <Card>
        <Text style={s.h2}>Lịch sử</Text>
        {ledger.length === 0 && <Text style={s.muted}>Chưa có giao dịch.</Text>}
        {ledger.map((e) => (
          <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[s.muted, { flex: 1 }]} numberOfLines={1}>{new Date(e.createdAt).toLocaleDateString("vi-VN")} · {e.note}</Text>
            <Text style={{ fontWeight: "600", color: e.amount > 0 ? colors.greenDark : colors.red }}>{e.amount > 0 ? "+" : ""}{e.amount}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
