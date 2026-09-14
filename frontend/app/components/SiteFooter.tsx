"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <footer className="site-footer">
      <div className="cinema-container flex flex-wrap items-start justify-between gap-8 py-10">
        <div><Link href="/" className="text-lg font-black tracking-wide">HAL CINEMA</Link>
          <p className="mt-3 text-xs text-[var(--text-muted)]">映画とフードを、まとめて予約。</p></div>
        <nav aria-label="フッターナビゲーション" className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-bold">
          <Link href="/movie-now">作品を探す</Link><Link href="/mypage">予約の確認</Link>
          <Link href="/theater">劇場案内</Link><Link href="/guide">ご利用ガイド</Link>
        </nav>
      </div>
      <div className="cinema-container border-t border-[var(--border-soft)] py-5 text-xs text-[var(--text-muted)]">© HAL CINEMA</div>
    </footer>
  );
}
