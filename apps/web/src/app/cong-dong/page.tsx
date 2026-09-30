import type { Metadata } from "next";
import Link from "next/link";
import { publicGet } from "@/lib/server";
import { timeAgo } from "@/lib/format";
import type { PostSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Cộng đồng", description: "Hỏi đáp chăm cây, khoe cây và chia sẻ kinh nghiệm làm vườn." };

const TABS: [string, string][] = [["", "Tất cả"], ["Question", "Hỏi đáp"], ["Showcase", "Khoe cây"], ["Guide", "Kinh nghiệm"]];
const TYPE_BADGE: Record<string, string> = { Question: "Hỏi đáp", Showcase: "Khoe cây", Guide: "Kinh nghiệm" };

type SP = { type?: string; q?: string; topic?: string; sort?: string; page?: string };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const data = await publicGet<{ items: PostSummary[]; page: number }>(`/api/community/posts?${qs}`, 30);
  const link = (patch: Partial<SP>) => `/cong-dong?${new URLSearchParams(Object.entries({ ...sp, ...patch, page: undefined }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold text-emerald-900">Cộng đồng</h1>
          <p className="mt-1 text-stone-600">Hỏi đáp chăm cây, khoe cây, chia sẻ kinh nghiệm. Không rao bán ở đây — hãy <Link href="/dang-tin" className="text-emerald-700 underline">đăng tin</Link>.</p>
        </div>
        <Link href="/cong-dong/dang-bai" className="rounded-full bg-emerald-800 px-5 py-2.5 font-bold text-stone-50 hover:bg-emerald-700">Đặt câu hỏi / Đăng bài</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([t, label]) => (
          <Link key={t} href={link({ type: t || undefined })} className={`rounded-full px-4 py-2 ${(sp.type ?? "") === t ? "bg-emerald-800 text-white" : "border border-stone-300 bg-white"}`}>{label}</Link>
        ))}
        <Link href={link({ sort: sp.sort === "unanswered" ? undefined : "unanswered", type: "Question" })} className={`rounded-full px-4 py-2 ${sp.sort === "unanswered" ? "bg-wood-600 text-white" : "border border-stone-300 bg-white"}`}>Chưa có trả lời</Link>
        <form action="/cong-dong" className="ml-auto flex gap-2">
          {sp.type && <input type="hidden" name="type" value={sp.type} />}
          <input name="q" defaultValue={sp.q} placeholder="Tìm bài…" className="h-10 rounded-full border border-stone-300 bg-white px-4" />
        </form>
      </div>
      {sp.topic && <p className="text-sm">Chủ đề: <b>#{sp.topic}</b> · <Link href={link({ topic: undefined })} className="text-emerald-700 underline">bỏ lọc</Link></p>}

      {!data && <p className="text-red-700">Không tải được dữ liệu từ máy chủ.</p>}
      {data?.items.length === 0 && <p className="text-stone-500">Chưa có bài nào.</p>}
      <ul className="space-y-3">
        {data?.items.map((p) => (
          <li key={p.id}>
            <Link href={`/cong-dong/${p.id}`} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 hover:border-emerald-600">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">{TYPE_BADGE[p.type]}</span>
                  {p.answered && <span className="rounded-full bg-wood-100 px-2 py-0.5 text-wood-800">Đã có câu trả lời hay</span>}
                  {p.topics.map((t) => <span key={t} className="text-stone-500">#{t}</span>)}
                </div>
                <h2 className="text-xl leading-tight text-stone-900">{p.title}</h2>
                <p className="line-clamp-2 text-sm text-stone-600">{p.excerpt}</p>
                <p className="text-xs text-stone-500">
                  {p.author?.name}{p.author?.expert && " · Chuyên gia"} · {p.author?.badge} · {timeAgo(p.lastActivityAt)} · ♥ {p.likes} · 💬 {p.comments}
                </p>
              </div>
              {p.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbUrl} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      {data && data.items.length === 20 && (
        <Link href={`/cong-dong?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(data.page + 1) })}`} className="block text-center font-bold text-emerald-700">Xem thêm</Link>
      )}
    </div>
  );
}
