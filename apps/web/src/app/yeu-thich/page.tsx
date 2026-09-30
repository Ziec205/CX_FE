"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListingCardView } from "@/components/ListingCardView";
import { Alert, Section, btn } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { savedQueryToHref } from "@/lib/search";
import type { ListingCard } from "@/lib/types";

interface Fav { card: ListingCard; priceWhenSaved?: number; priceDropped: boolean }
interface SavedSearch { id: string; name: string; query: Record<string, unknown>; lastNotifiedAt: string }
interface Follow { sellerId: string; createdAt: string }
interface PublicUser { id: string; displayName: string; flags: { hasVerifiedGarden: boolean } }

export default function FavoritesPage() {
  const [items, setItems] = useState<Fav[]>();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [fresh, setFresh] = useState<Record<string, ListingCard[]>>({});
  const [sellers, setSellers] = useState<PublicUser[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    api<Fav[]>("me/favorites").then((r) => { if (!cancelled) setItems(r); }, (e) => { if (!cancelled) setError(errorText(e)); });
    api<SavedSearch[]>("me/saved-searches").then((r) => { if (!cancelled) setSearches(r); }, () => {});
    api<Follow[]>("me/follows").then(async (list) => {
      const users = await Promise.all(list.map((f) => api<PublicUser>(`users/${f.sellerId}`).catch(() => null)));
      if (!cancelled) setSellers(users.filter((u): u is PublicUser => !!u));
    }, () => {});
    return () => { cancelled = true; };
  }, []);

  async function remove(id: string) {
    await api(`me/favorites/${id}`, { method: "DELETE" });
    setItems(items?.filter((f) => f.card.id !== id));
  }
  async function checkNew(s: SavedSearch) {
    try { setFresh({ ...fresh, [s.id]: await api<ListingCard[]>(`me/saved-searches/${s.id}/new`) }); } catch (e) { setError(errorText(e)); }
  }
  async function removeSearch(id: string) {
    await api(`me/saved-searches/${id}`, { method: "DELETE" });
    setSearches(searches.filter((s) => s.id !== id));
  }
  async function unfollow(id: string) {
    await api(`me/follows/${id}`, { method: "DELETE" });
    setSellers(sellers.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-emerald-900">Đã lưu</h1>
      {error && <Alert>{error}</Alert>}

      <Section title={`Tìm kiếm đã lưu (${searches.length}/20)`}>
        {searches.length === 0 && <p className="text-sm text-stone-500">Bấm “Lưu tìm kiếm” ở trang tìm kiếm để được báo khi có tin mới khớp.</p>}
        <ul className="space-y-3">
          {searches.map((s) => (
            <li key={s.id} className="rounded-xl border border-stone-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={savedQueryToHref(s.query)} className="font-bold text-emerald-800 hover:underline">{s.name}</Link>
                <div className="flex gap-2">
                  <button onClick={() => checkNew(s)} className={btn.small}>Xem tin mới</button>
                  <button onClick={() => removeSearch(s.id)} className="text-sm text-stone-500 hover:text-red-700">Xóa</button>
                </div>
              </div>
              {fresh[s.id] && (fresh[s.id].length === 0
                ? <p className="mt-2 text-sm text-stone-500">Chưa có tin mới kể từ lần xem trước.</p>
                : <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{fresh[s.id].slice(0, 8).map((l) => <ListingCardView key={l.id} l={l} />)}</div>)}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Người bán đang theo dõi (${sellers.length})`}>
        {sellers.length === 0 && <p className="text-sm text-stone-500">Bấm “Theo dõi” trên trang người bán để nhận tin mới của họ.</p>}
        <ul className="flex flex-wrap gap-2">
          {sellers.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-4 pr-2">
              <Link href={`/nguoi-ban/${u.id}`} className="hover:underline">{u.displayName}{u.flags.hasVerifiedGarden && " ✓"}</Link>
              <button onClick={() => unfollow(u.id)} aria-label="Bỏ theo dõi" className="rounded-full px-2 text-stone-400 hover:text-red-700">×</button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tin đã lưu">
        {items?.length === 0 && <p className="text-sm text-stone-500">Bạn chưa lưu tin nào.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items?.map((f) => (
            <div key={f.card.id} className="relative">
              {f.priceDropped && <span className="absolute right-2 top-2 z-10 rounded bg-emerald-800 px-1.5 py-0.5 text-[11px] font-medium text-white">Giảm giá</span>}
              <ListingCardView l={f.card} />
              <button onClick={() => remove(f.card.id)} className="mt-1 w-full text-xs text-stone-500 hover:text-red-700">Bỏ lưu</button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
