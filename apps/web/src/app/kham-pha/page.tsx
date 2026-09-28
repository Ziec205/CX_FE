import type { Metadata } from "next";
import Link from "next/link";
import { publicGet } from "@/lib/server";
import type { Article } from "@/lib/types";

export const metadata: Metadata = { title: "Khám phá", description: "Mỗi ngày một loài cây ít người biết, do đội ngũ Chạm Xanh tuyển chọn." };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const data = await publicGet<{ items: Article[]; total: number; pageSize: number }>(`/api/explore?page=${page}&pageSize=12`, 300);
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl tracking-tight text-emerald-800">Khám phá</h1>
        <p className="mt-2 text-stone-600">Mỗi ngày một loài cây ít người biết.</p>
      </div>
      {!data && <p className="text-red-700">Không tải được dữ liệu từ máy chủ.</p>}
      {data?.items.length === 0 && <p className="text-stone-500">Chưa có bài viết nào.</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((a) => (
          <Link key={a.id} href={`/kham-pha/${a.slug}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {a.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.cover.urls.card} alt="" className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90" />
            )}
            <div className="space-y-1.5 p-4">
              <p className="text-xs text-stone-500">{a.publishAt && new Date(a.publishAt).toLocaleDateString("vi-VN")}</p>
              <h2 className="text-xl leading-tight text-emerald-800 group-hover:underline">{a.title}</h2>
              {a.summary && <p className="line-clamp-2 text-sm text-stone-600">{a.summary}</p>}
            </div>
          </Link>
        ))}
      </div>
      {pages > 1 && (
        <nav className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/kham-pha?page=${p}`} className={`rounded-full px-3 py-1 ${p === page ? "bg-emerald-800 text-white" : "border border-stone-300"}`}>{p}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
