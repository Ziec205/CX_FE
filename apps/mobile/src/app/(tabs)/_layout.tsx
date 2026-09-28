import { router, Tabs } from "expo-router";
import { Pressable, Text } from "react-native";
import { colors } from "@/components/ui";

const icon = (emoji: string) => function TabIcon({ focused }: { focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
};

const Bell = () => (
  <Pressable onPress={() => router.push("/notifications")} accessibilityLabel="Thông báo" style={{ paddingHorizontal: 14 }}>
    <Text style={{ fontSize: 20 }}>🔔</Text>
  </Pressable>
);

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.green, headerTintColor: colors.greenDark, headerRight: Bell }}>
      <Tabs.Screen name="index" options={{ title: "Chạm Xanh", tabBarLabel: "Trang chủ", tabBarIcon: icon("🌿") }} />
      <Tabs.Screen name="garden" options={{ title: "Vườn của tôi", tabBarLabel: "Vườn", tabBarIcon: icon("🪴") }} />
      <Tabs.Screen name="post" options={{ title: "Đăng tin", tabBarIcon: icon("➕") }} />
      <Tabs.Screen name="chats" options={{ title: "Tin nhắn", tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="account" options={{ title: "Tài khoản", tabBarIcon: icon("👤") }} />
    </Tabs>
  );
}
