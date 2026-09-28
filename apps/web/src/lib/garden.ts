import type { CareReminder, ReminderKind, ReminderRepeat } from "./types";

export const KIND_LABEL: Record<ReminderKind, string> = {
  Watering: "Tưới cây", Fertilizing: "Bón phân", Pruning: "Cắt tỉa", Repotting: "Thay chậu", Other: "Chăm cây",
};
export const REPEAT_UNIT: Record<ReminderRepeat, string> = { None: "Không lặp", Daily: "ngày", Weekly: "tuần", Monthly: "tháng", Yearly: "năm" };

export function repeatText(r: Pick<CareReminder, "repeat" | "interval">) {
  if (r.repeat === "None") return "Một lần";
  return r.interval > 1 ? `Mỗi ${r.interval} ${REPEAT_UNIT[r.repeat]}` : `Hằng ${REPEAT_UNIT[r.repeat]}`;
}

/** Giá trị cho input datetime-local theo giờ máy người dùng. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Mặc định lần nhắc đầu: 7 giờ sáng ngày mai. */
export function defaultFirstReminder(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  return d;
}

/** Ghép giờ-phút-ngày-tháng-năm do người dùng nhập; null nếu không phải ngày giờ có thật (vd 31/02). */
export function composeDateTime(hour: string, minute: string, day: string, month: string, year: string): Date | null {
  const [h, mi, d, mo, y] = [hour, minute, day, month, year].map((x) => (/^\d+$/.test(x.trim()) ? Number(x) : NaN));
  if ([h, mi, d, mo, y].some(Number.isNaN)) return null;
  if (h > 23 || mi > 59 || mo < 1 || mo > 12 || d < 1 || y < 2000 || y > 2100) return null;
  const at = new Date(y, mo - 1, d, h, mi);
  return at.getDate() === d && at.getMonth() === mo - 1 ? at : null;
}

/** Các lời nhắc đang bật sắp tới của cả vườn, sớm nhất trước. */
export function upcomingReminders<P extends { name: string; reminders: CareReminder[] }>(plants: P[], limit = 6) {
  return plants
    .flatMap((p) => p.reminders.filter((r) => r.enabled && r.nextAt).map((r) => ({ ...r, plantName: p.name })))
    .sort((a, b) => new Date(a.nextAt!).getTime() - new Date(b.nextAt!).getTime())
    .slice(0, limit);
}
