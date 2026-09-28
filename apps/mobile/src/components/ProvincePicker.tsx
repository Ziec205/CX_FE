import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { PROVINCES, provinceName } from "@/lib/provinces";
import { Button, colors, s } from "./ui";

export function ProvincePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={s.input}>
        <Text style={{ color: value ? colors.text : colors.muted }}>{value ? provinceName(value) : "Chọn tỉnh / thành"}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, paddingTop: 48 }}>
          <FlatList data={PROVINCES} keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item.id); setOpen(false); }} style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontWeight: item.id === value ? "700" : "400", color: item.id === value ? colors.green : colors.text }}>{item.name}</Text>
              </Pressable>
            )} />
          <View style={{ padding: 16 }}><Button title="Đóng" variant="secondary" onPress={() => setOpen(false)} /></View>
        </View>
      </Modal>
    </>
  );
}
