import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore (Keychain/Keystore) trên điện thoại. Bản web của Expo không có SecureStore nên dùng localStorage — chỉ để thử khi dev.
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
