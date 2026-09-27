"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Type & Pokédex", href: "/" },
  { label: "Items", href: "/items" },
  { label: "Team Builder", href: "/team" },
  { label: "Speed Check", href: "/speed" },
  { label: "Battle Optimizer", href: "/optimizer" },
  { label: "Live Battle", href: "/battle" },
  { label: "Battle History", href: "/history" },
  { label: "Trainer Roster", href: "/trainers", comingSoon: true },
];

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  if (item.comingSoon) {
    return (
      <span
        className="block cursor-not-allowed rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--screen)]/30 sm:text-xs"
        title="Coming soon"
      >
        {item.label}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`block rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors sm:text-xs ${
        isActive
          ? "bg-[color:var(--shell-accent)] text-white"
          : "text-[color:var(--screen)]/70 hover:bg-white/10 hover:text-[color:var(--screen)]"
      }`}
    >
      {item.label}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-black/20 bg-[color:var(--shell)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="shrink-0 font-display text-lg font-semibold tracking-tight text-[color:var(--screen)]"
        >
          Poké<span className="text-[color:var(--shell-accent)]">Help</span>
        </Link>

        {/* Desktop nav — wraps onto a second line if needed instead of scrolling */}
        <nav aria-label="Main navigation" className="hidden flex-1 lg:block">
          <ul className="flex flex-wrap items-center justify-end gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink item={item} isActive={pathname === item.href} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile/tablet: hamburger toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          className="flex shrink-0 items-center justify-center rounded-md p-2 text-[color:var(--screen)] hover:bg-white/10 lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {menuOpen ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile/tablet dropdown */}
      {menuOpen && (
        <nav aria-label="Main navigation (mobile)" className="border-t border-black/20 lg:hidden">
          <ul className="mx-auto max-w-5xl space-y-1 px-4 py-3 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink item={item} isActive={pathname === item.href} onClick={() => setMenuOpen(false)} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}