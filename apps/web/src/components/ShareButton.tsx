"use client";

/** Chia sẻ trang đang xem; trình duyệt không hỗ trợ thì chép liên kết. */
export function ShareButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      aria-label="Chia sẻ"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-stone-900"
      onClick={() => {
        const url = window.location.href;
        if (navigator.share) navigator.share({ title, url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
      </svg>
    </button>
  );
}
