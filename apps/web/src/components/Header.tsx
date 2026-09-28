import Link from "next/link";
import { isSignedIn } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";
import { NotificationBell } from "./NotificationBell";

export async function Header() {
  const signedIn = await isSignedIn();
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-10 lg:py-4">
        <Link href="/" className="text-2xl font-bold tracking-tight text-emerald-800">
          Chạm<span className="font-normal italic text-wood-600"> Xanh</span>
        </Link>
        <form action="/tim-kiem" className="order-last flex w-full items-center gap-2 md:order-none md:w-auto md:flex-1 lg:max-w-md">
          <label htmlFor="header-q" className="sr-only">Tìm kiếm</label>
          <input id="header-q" name="q" placeholder="Tìm cây, chậu, vật tư…"
            className="h-11 w-full rounded-full border border-stone-300 bg-white px-5 text-[15px] placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none" />
          <Link href="/tim-bang-anh" title="Tìm bằng ảnh" aria-label="Tìm bằng ảnh" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white hover:border-emerald-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" />
            </svg>
          </Link>
        </form>
        <nav className="ml-auto flex items-center gap-5 text-[15px]">
          <Link href="/thu-vien" className="hidden hover:text-emerald-700 xl:inline">Thư viện</Link>
          <Link href="/kham-pha" className="hidden hover:text-emerald-700 lg:inline">Khám phá</Link>
          <Link href="/cong-dong" className="hidden hover:text-emerald-700 md:inline">Cộng đồng</Link>
          <Link href="/ban-do" className="hidden hover:text-emerald-700 xl:inline">Bản đồ</Link>
          {signedIn ? (
            <>
              <Link href="/vuon-cua-toi" className="hidden hover:text-emerald-700 sm:inline">Vườn của tôi</Link>
              <Link href="/tin-nhan" className="hover:text-emerald-700">Tin nhắn</Link>
              <Link href="/don-hang" className="hidden hover:text-emerald-700 lg:inline">Đơn hàng</Link>
              <NotificationBell />
              <Link href="/tai-khoan" className="hover:text-emerald-700">Tài khoản</Link>
              <span className="hidden xl:inline"><LogoutButton /></span>
            </>
          ) : (
            <Link href="/dang-nhap" className="hover:text-emerald-700">Đăng nhập</Link>
          )}
          <Link href="/dang-tin" className="rounded-full bg-emerald-800 px-5 py-2.5 font-bold text-stone-50 hover:bg-emerald-700">Đăng tin</Link>
        </nav>
      </div>
    </header>
  );
}
