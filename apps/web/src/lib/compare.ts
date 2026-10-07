"use client";

import { useSyncExternalStore } from "react";

// Danh sách tin chọn để so sánh, lưu trên máy người dùng (tối đa 4 tin).
const KEY = "cx-compare";
export const MAX_COMPARE = 4;
export interface CompareItem { id: string; title: string; thumbUrl?: string | null }

const listeners = new Set<() => void>();
let cache: CompareItem[] | null = null;
const EMPTY: CompareItem[] = [];

function read(): CompareItem[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as CompareItem[]; } catch { cache = []; }
  return cache;
}

function write(items: CompareItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* chế độ riêng tư: chỉ giữ trong phiên */ }
  listeners.forEach((l) => l());
}

export function useCompare() {
  const items = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    read,
    () => EMPTY,
  );
  return {
    items,
    has: (id: string) => items.some((i) => i.id === id),
    toggle: (item: CompareItem) => {
      if (items.some((i) => i.id === item.id)) write(items.filter((i) => i.id !== item.id));
      else if (items.length < MAX_COMPARE) write([...items, item]);
      else return false;
      return true;
    },
    remove: (id: string) => write(items.filter((i) => i.id !== id)),
    clear: () => write([]),
  };
}
