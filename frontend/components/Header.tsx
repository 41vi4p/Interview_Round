"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/", label: "Converter" },
  { href: "/budget", label: "Budget" },
  { href: "/history", label: "History" },
];

export function Header() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-board/95 backdrop-blur supports-[backdrop-filter]:bg-board/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-bright opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-bright" />
          </span>
          <span className="font-display text-[15px] font-semibold uppercase tracking-[0.16em] text-ink">
            Rate Board
          </span>
        </Link>

        <nav className="flex items-center gap-1 font-display text-[13px] font-medium uppercase tracking-[0.08em]">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "bg-panel-raised text-ink"
                    : "text-ink-dim hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 font-mono text-xs">
          {loading ? null : user ? (
            <>
              <span className="hidden text-ink-dim sm:inline">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="cursor-pointer rounded-md border border-hairline px-3 py-1.5 text-ink-dim transition-colors hover:border-coral hover:text-coral"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="cursor-pointer rounded-md bg-ink px-3 py-1.5 text-board transition-opacity hover:opacity-85"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
