"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmailForm } from "@/components/EmailForm";
import { Alert, Section } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import type { Me } from "@/lib/types";

const GROUP_LABEL: Record<string, string> = {
  chat: "Tin nhắn", listing: "Tin đăng, báo giá, thuê cây", discovery: "Tìm kiếm đã lưu, yêu thích, theo dõi",
  community: "Cộng đồng", care: "Nhắc chăm cây", marketing: "Khuyến mãi, gợi ý",
  transaction: "Giao dịch, gói dịch vụ (không tắt được)", security: "Bảo mật tài khoản (không tắt được)",
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me>();
  const [groups, setGroups] = useState<Record<string, boolean>>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    api<Me>("me").then((m) => { if (!cancelled) setMe(m); }, (e) => { if (!cancelled) setError(errorText(e)); });
    api<Record<string, boolean>>("me/notifications/settings").then((g) => { if (!cancelled) setGroups(g); }, () => {});
    return () => { cancelled = true; };
  }, []);

  async function toggle(group: string) {
    if (!groups || group === "transaction" || group === "security") return;
    try { setGroups(await api<Record<string, boolean>>("me/notifications/settings", { method: "PUT", json: { groups: { [group]: !groups[group] } } })); }
    catch (e) { setError(errorText(e)); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl font-extrabold text-emerald-900 sm:text-5xl">Cài đặt</h1>
      {error && <Alert>{error}</Alert>}

      <Section title="Email nhận nhắc lịch">
        <p className="mb-3 text-[15px] text-stone-600">
          Lịch nhắc tưới, bón phân trong <Link href="/vuon-cua-toi#lich-nhac" className="font-semibold text-emerald-800 underline">Hồ sơ vườn</Link> được gửi tới email này.
          Chưa có email thì không đặt được lời nhắc.
        </p>
        {me ? <EmailForm email={me.email} onSaved={setMe} /> : <div className="cx-shimmer h-12 rounded-2xl" />}
      </Section>

      <Section title="Thông báo">
        <p className="mb-3 text-sm text-stone-500">Chọn nhóm thông báo muốn nhận trên điện thoại. Thông báo trong app luôn được lưu ở trang <Link href="/thong-bao" className="underline">Thông báo</Link>.</p>
        <ul className="space-y-2">
          {!groups && <li className="cx-shimmer h-24 rounded-2xl" />}
          {groups && Object.entries(GROUP_LABEL).map(([g, label]) => (
            <li key={g}>
              <label className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" checked={groups[g] ?? true} disabled={g === "transaction" || g === "security"} onChange={() => toggle(g)} className="h-4 w-4 accent-emerald-700" />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Gói dịch vụ">
        <p className="text-[15px] text-stone-600">Xem gói đang dùng, nâng cấp hoặc gia hạn ở trang <Link href="/goi" className="font-semibold text-emerald-800 underline">Nâng cấp tài khoản</Link>.</p>
      </Section>
    </div>
  );
}
