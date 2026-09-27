"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Add near the top, alongside NAV_ITEMS
const MOBILE_TAB_HREFS = ["/", "/team", "/optimizer", "/battle"];

function TabIcon({ href }: { href: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" as const };
  switch (href) {
    case "/": // Pokédex / Type lookup — Poké Ball glyph
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2.5 10h15" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="2.25" fill="currentColor" />
        </svg>
      );
    case "/team": // Team Builder — roster/grid glyph
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "/optimizer": // Battle Optimizer — crossed swords
      return (
        <svg {...common}>
          <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "/battle": // Live Battle — bolt
      return (
        <svg {...common}>
          <path d="M11 2 4 11h5l-1 7 7-9h-5l1-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="16" cy="10" r="1.6" />
    </svg>
  );
}

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

      {/* Mobile bottom tab bar — replaces top-right hamburger on phones/tablets */}
        <nav
          aria-label="Primary navigation (mobile)"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-black/20 bg-[color:var(--shell)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {NAV_ITEMS.filter((item) => MOBILE_TAB_HREFS.includes(item.href)).map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide ${
                      isActive ? "text-[color:var(--accent-gold)]" : "text-[color:var(--screen)]/60"
                    }`}
                  >
                    <TabIcon href={item.href} />
                    {item.label.split(" ")[0]}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                className="flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--screen)]/60"
              >
                <MoreIcon />
                More
              </button>
            </li>
          </ul>
        </nav>
    </header>
  );
}