import Link from "next/link";
import { isSignedIn } from "@/lib/session";
import { FeatureRail } from "./FeatureNav";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const signedIn = await isSignedIn();
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50 md:bg-stone-50/95 md:backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-emerald-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" className="h-8 w-auto" />
          Chạm Xanh
        </Link>
        <form action="/tim-kiem" className="order-last flex w-full items-center gap-2 md:order-none md:w-auto md:flex-1 lg:max-w-lg">
          <label htmlFor="header-q" className="sr-only">Tìm kiếm</label>
          <input id="header-q" name="q" placeholder="Tìm cây, chậu, vật tư…"
            className="h-11 w-full rounded-full border border-stone-300 bg-white px-5 text-[15px] placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none" />
          <Link href="/tim-bang-anh" title="Tìm bằng ảnh" aria-label="Tìm bằng ảnh" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white hover:border-emerald-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" />
            </svg>
          </Link>
        </form>
        <nav aria-label="Tài khoản" className="ml-auto flex items-center gap-3 text-[15px] lg:gap-5">
          {signedIn ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <Link href="/dang-nhap" className="font-semibold hover:text-emerald-700">Đăng nhập</Link>
          )}
          <Link href="/dang-tin" className="cx-press hidden rounded-full bg-wood-400 px-5 py-2.5 font-semibold text-stone-900 hover:brightness-95 sm:inline-block">Đăng tin</Link>
          <MobileMenu signedIn={signedIn} links={[
            { href: "/thu-vien", label: "Thư viện cây" },
            { href: "/tim-bang-anh", label: "Tìm bằng ảnh" },
          ]} />
        </nav>
      </div>
      <FeatureRail />
    </header>
  );
}
