import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";

export const colors = {
  green: "#059669", greenDark: "#047857", greenLight: "#ecfdf5", text: "#1c1917", muted: "#78716c",
  border: "#e7e5e4", bg: "#fafaf9", white: "#ffffff", red: "#dc2626", rose: "#e11d48", amber: "#fef3c7", amberText: "#92400e",
};

export function Button({ title, onPress, variant = "primary", disabled, loading, style }: {
  title: string; onPress?: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const bg = variant === "primary" ? colors.green : colors.white;
  const fg = variant === "primary" ? colors.white : variant === "danger" ? colors.red : colors.text;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: variant === "primary" ? bg : colors.border, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, required, hint, ...props }: TextInputProps & { label?: string; required?: boolean; hint?: string }) {
  return (
    <View style={{ gap: 4 }}>
      {label && <Text style={s.label}>{label}{required && <Text style={{ color: colors.red }}> *</Text>}</Text>}
      <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: "top" }, props.style]} />
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.green, borderColor: colors.green }]}>
      <Text style={{ color: active ? colors.white : colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ kind = "err", text }: { kind?: "ok" | "err" | "warn" | "info"; text: string }) {
  const bg = { ok: colors.greenLight, err: "#fef2f2", warn: colors.amber, info: "#f0f9ff" }[kind];
  const fg = { ok: colors.greenDark, err: colors.red, warn: colors.amberText, info: "#075985" }[kind];
  return <View style={[s.notice, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 13 }}>{text}</Text></View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  btn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "600", fontSize: 15 },
  label: { fontWeight: "600", fontSize: 14, color: colors.text },
  hint: { fontSize: 12, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white, color: colors.text },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.white },
  notice: { borderRadius: 10, padding: 10 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text },
  h2: { fontSize: 17, fontWeight: "700", color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  price: { fontSize: 16, fontWeight: "700", color: colors.rose },
});
