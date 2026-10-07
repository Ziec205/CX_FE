"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AiChat } from "@/components/AiChat";
import { Sparkle, useMyPlan } from "@/components/PlanGate";
import { api, errorText } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { AiConversation } from "@/lib/types";

export default function AssistantPage() {
  const [list, setList] = useState<AiConversation[]>();
  const [active, setActive] = useState<string>();
  const [chatKey, setChatKey] = useState(0);
  const [error, setError] = useState<string>();
  const [showList, setShowList] = useState(false);
  const [plan] = useMyPlan();

  const load = useCallback(() => {
    api<AiConversation[]>("ai/conversations").then(setList, (e) => setError(errorText(e)));
  }, []);
  useEffect(load, [load]);

  function startNew() {
    setActive(undefined);
    setChatKey((k) => k + 1); // khung chat mới tinh
    setShowList(false);
  }

  async function remove(c: AiConversation) {
    if (!confirm(`Xóa cuộc trò chuyện "${c.title}"?`)) return;
    try {
      await api(`ai/conversations/${c.id}`, { method: "DELETE" });
      if (active === c.id) startNew();
      load();
    } catch (e) { setError(errorText(e)); }
  }

  const onConversation = (c: AiConversation) => {
    setActive(c.id);
    setList((l) => [c, ...(l ?? []).filter((x) => x.id !== c.id)]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-extrabold text-emerald-900 sm:text-5xl">
            <Sparkle className="h-9 w-9 text-wood-400" />Trợ lý AI
          </h1>
          <p className="mt-1 text-stone-600">Hỏi về chăm cây, chẩn đoán bệnh qua ảnh, chọn cây và mua bán cây. Lịch sử lưu 60 ngày.</p>
        </div>
        {plan && (
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-stone-200">
            <span>Gói <b>{plan.plan.name}</b> · {plan.plan.aiPerDay} lượt/ngày</span>
            <Link href="/goi" className="font-semibold text-emerald-800 underline">{plan.plan.code === "Pro" ? "Quản lý gói" : "Nâng gói"}</Link>
          </div>
        )}
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={startNew} className="cx-press flex-1 rounded-full bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">+ Cuộc trò chuyện mới</button>
            <button type="button" onClick={() => setShowList((s) => !s)} aria-expanded={showList} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-stone-300 lg:hidden">
              Lịch sử{list ? ` (${list.length})` : ""}
            </button>
          </div>
          <nav aria-label="Các cuộc trò chuyện" className={`${showList ? "block" : "hidden"} max-h-[60dvh] overflow-y-auto rounded-3xl bg-white p-2 ring-1 ring-stone-200 lg:block`}>
            {!list && <div className="cx-shimmer h-24 rounded-2xl" />}
            {list?.length === 0 && <p className="px-3 py-4 text-sm text-stone-500">Chưa có cuộc trò chuyện nào.</p>}
            <ul className="space-y-1">
              {list?.map((c) => (
                <li key={c.id} className="group flex items-center gap-1">
                  <button type="button" onClick={() => { setActive(c.id); setShowList(false); }} aria-current={active === c.id ? "true" : undefined}
                    className={`min-w-0 flex-1 rounded-2xl px-3 py-2 text-left ${active === c.id ? "bg-emerald-50 text-emerald-900" : "hover:bg-stone-50"}`}>
                    <span className="block truncate font-semibold">{c.title}</span>
                    <span className="block text-xs text-stone-500">{timeAgo(c.updatedAt)}</span>
                  </button>
                  <button type="button" onClick={() => remove(c)} aria-label={`Xóa ${c.title}`}
                    className="rounded-full p-2 text-stone-400 hover:bg-red-50 hover:text-red-700 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" strokeLinejoin="round" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {plan?.plan.marketCompare && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Gói Pro: bấm <b>So sánh</b> trên các tin trong chợ để AI chọn giúp, hoặc mở <Link href="/tai-khoan" className="font-semibold underline">tin của bạn</Link> để so với chợ.
            </p>
          )}
        </aside>

        <section aria-label="Trò chuyện" className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-stone-200 sm:p-5">
          <AiChat key={chatKey} conversationId={active} onConversation={onConversation} />
        </section>
      </div>
    </div>
  );
}
