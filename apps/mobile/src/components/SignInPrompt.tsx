import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button, s } from "./ui";

export function SignInPrompt({ text }: { text: string }) {
  return (
    <View style={[s.screen, { padding: 24, gap: 14, justifyContent: "center" }]}>
      <Text style={{ fontSize: 48, textAlign: "center" }}>🌿</Text>
      <Text style={[s.h2, { textAlign: "center" }]}>{text}</Text>
      <Button title="Đăng nhập bằng số điện thoại" onPress={() => router.push("/login")} />
    </View>
  );
}
