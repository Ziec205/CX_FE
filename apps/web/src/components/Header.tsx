import Link from "next/link";
import { isSignedIn } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";
import { MobileMenu } from "./MobileMenu";
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
        <nav aria-label="Chính" className="ml-auto flex items-center gap-3 text-[15px] lg:gap-5">
          <Link href="/cho-cay" className="inline-flex items-center gap-1.5 rounded-full bg-wood-100 px-3 py-2 font-bold text-wood-800 ring-1 ring-wood-200 hover:bg-wood-200 sm:px-4">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" strokeLinejoin="round" />
            </svg>
            Chợ cây
          </Link>
          {/* Từ lg trở lên: đủ mục trên thanh ngang. Dưới lg: gom vào MobileMenu. */}
          <Link href="/thu-vien" className="hidden hover:text-emerald-700 xl:inline">Thư viện</Link>
          <Link href="/kham-pha" className="hidden hover:text-emerald-700 lg:inline">Khám phá</Link>
          <Link href="/cong-dong" className="hidden hover:text-emerald-700 lg:inline">Cộng đồng</Link>
          <Link href="/ban-do" className="hidden hover:text-emerald-700 xl:inline">Bản đồ</Link>
          {signedIn ? (
            <>
              <Link href="/vuon-cua-toi" className="hidden hover:text-emerald-700 xl:inline">Vườn của tôi</Link>
              <Link href="/tin-nhan" className="hidden hover:text-emerald-700 lg:inline">Tin nhắn</Link>
              <Link href="/don-hang" className="hidden hover:text-emerald-700 xl:inline">Đơn hàng</Link>
              <NotificationBell />
              <Link href="/tai-khoan" className="hidden hover:text-emerald-700 lg:inline">Tài khoản</Link>
              <span className="hidden xl:inline"><LogoutButton /></span>
            </>
          ) : (
            <Link href="/dang-nhap" className="hidden hover:text-emerald-700 lg:inline">Đăng nhập</Link>
          )}
          <Link href="/dang-tin" className="hidden rounded-full bg-emerald-800 px-5 py-2.5 font-bold text-stone-50 hover:bg-emerald-700 sm:inline-block">Đăng tin</Link>
          <MobileMenu signedIn={signedIn} links={[
            { href: "/cho-cay", label: "Chợ cây" },
            { href: "/thu-vien", label: "Thư viện cây" },
            { href: "/kham-pha", label: "Khám phá" },
            { href: "/cong-dong", label: "Cộng đồng" },
            { href: "/ban-do", label: "Bản đồ nhà vườn" },
            ...(signedIn ? [
              { href: "/vuon-cua-toi", label: "Vườn của tôi" },
              { href: "/tin-nhan", label: "Tin nhắn" },
              { href: "/don-hang", label: "Đơn hàng" },
              { href: "/yeu-thich", label: "Yêu thích" },
              { href: "/thong-bao", label: "Thông báo" },
              { href: "/tai-khoan", label: "Tài khoản" },
            ] : []),
          ]} />
        </nav>
      </div>
    </header>
  );
}
