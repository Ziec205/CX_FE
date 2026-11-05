import type { Article } from "@/lib/types";

/** Chip lọc theo nội dung bài; giữ cùng danh sách với app (lib/screens/explore_screen.dart). */
export const CHIPS: Record<string, string[]> = {
  "Dễ chăm": ["dễ", "không hề cầu kì", "chịu bóng"],
  "Kiểng lá": ["kiểng lá", "lá"],
  "Phòng ngủ": ["phòng ngủ", "phòng đọc"],
  "Phong thủy": ["may mắn", "tài lộc", "phong thủy"],
  "Gia vị": ["gia vị", "ẩm thực"],
};

export function matches(a: Article, chip: string) {
  const text = `${a.title} ${a.summary ?? ""} ${a.tags.join(" ")}`.toLowerCase();
  return (CHIPS[chip] ?? []).some((k) => text.includes(k));
}

export const chipsOf = (a: Article) => Object.keys(CHIPS).filter((c) => matches(a, c));
