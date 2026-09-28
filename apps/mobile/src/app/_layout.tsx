import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/components/ui";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.greenDark, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ title: "Chi tiết tin" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Tin nhắn" }} />
        <Stack.Screen name="login" options={{ title: "Đăng nhập", presentation: "modal" }} />
        <Stack.Screen name="wallet" options={{ title: "Ví Xu Xanh" }} />
        <Stack.Screen name="notifications" options={{ title: "Thông báo" }} />
        <Stack.Screen name="orders" options={{ title: "Đơn đảm bảo" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Chi tiết đơn" }} />
        <Stack.Screen name="community/index" options={{ title: "Cộng đồng" }} />
        <Stack.Screen name="community/[id]" options={{ title: "Bài viết" }} />
        <Stack.Screen name="explore/[slug]" options={{ title: "Khám phá" }} />
        <Stack.Screen name="checkout" options={{ title: "Thanh toán" }} />
      </Stack>
    </AuthProvider>
  );
}
