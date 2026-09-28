"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PokemonTypeName } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { AnimatePresence, motion } from "motion/react";


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
    case "/items":
      return (
        <svg {...common}>
          <path d="M6 7h8l1 10a1 1 0 01-1 1H6a1 1 0 01-1-1L6 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 7a2 2 0 114 0" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "/speed":
      return (
        <svg {...common}>
          <circle cx="10" cy="11.5" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 11.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 2.5h4M10 2.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 4l1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "/history":
      return (
        <svg {...common}>
          <path d="M3 10a7 7 0 1 1 2 4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M3 6v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case "/trainers":
      return (
        <svg {...common}>
          <circle cx="10" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 11l-1.5 6 4.5-2.5 4.5 2.5L13 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        </svg>
      );
      return (
        <svg {...common}>
          <path d="M11 2 4 11h5l-1 7 7-9h-5l1-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

function HeaderEmblem() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 opacity-[0.06] sm:h-64 sm:w-64"
    >
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--screen)" strokeWidth="14" />
      <path d="M10 100h180" stroke="var(--screen)" strokeWidth="14" />
      <circle cx="100" cy="100" r="28" fill="var(--shell)" stroke="var(--screen)" strokeWidth="14" />
    </svg>
  );
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
  themeType: PokemonTypeName;
  mobileLabel?: string; // shorter/clearer label for the bottom tab bar
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Type & Pokédex", href: "/", themeType: "grass", mobileLabel: "Dex" },
  { label: "Items", href: "/items", themeType: "poison" },
  { label: "Team Builder", href: "/team", themeType: "water", mobileLabel: "Team" },
  { label: "Battle Optimizer", href: "/optimizer", themeType: "fighting", mobileLabel: "Matchups" },
  { label: "Battle History", href: "/history", themeType: "psychic", mobileLabel: "History" },
  { label: "Trainer Roster", href: "/trainers", themeType: "dragon", comingSoon: true },
];

const MOBILE_TAB_HREFS = ["/", "/items", "/team", "/optimizer", "/history"];

function NavIconBadge({
  href,
  themeType,
  active,
  size = "md",
}: {
  href: string;
  themeType: PokemonTypeName;
  active: boolean;
  size?: "sm" | "md";
}) {
  const color = TYPE_COLOR[themeType];
  const dims = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  return (
    <motion.span
      whileTap={{ scale: 0.88 }}
      className={`flex shrink-0 items-center justify-center rounded-full ${dims} transition-all duration-200`}
      style={{
        background: active
          ? `radial-gradient(circle at 32% 28%, ${color}, ${color}bb)`
          : "rgba(255,255,255,0.06)",
        boxShadow: active ? `0 0 0 2px ${color}40, 0 3px 10px ${color}55` : "none",
        color: active ? "#fff" : "var(--screen)",
        opacity: active ? 1 : 0.55,
      }}
    >
      <TabIcon href={href} />
    </motion.span>
  );
}

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const color = TYPE_COLOR[item.themeType];

  if (item.comingSoon) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-2 rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[color:var(--screen)]/30 sm:text-xs"
        title="Coming soon"
      >
        <NavIconBadge href={item.href} themeType={item.themeType} active={false} size="sm" />
        {item.label}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[11px] font-medium uppercase tracking-wide transition-colors sm:text-xs"
      style={{
        background: isActive ? `${color}26` : "transparent",
        color: isActive ? "var(--screen)" : "var(--screen)aa",
      }}
    >
      <NavIconBadge href={item.href} themeType={item.themeType} active={isActive} size="sm" />
      {item.label}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 overflow-hidden bg-gradient-to-b from-[#26282c] to-[color:var(--shell)]">
      <HeaderEmblem />
      <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-2.5 font-logo text-lg font-semibold tracking-tight text-[color:var(--screen)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent-gold)] to-[color:var(--shell-accent)] shadow-[0_0_14px_rgba(255,199,44,0.45)]">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#1f2124" strokeWidth="2" />
              <path d="M2 10h16" stroke="#1f2124" strokeWidth="2" />
              <circle cx="10" cy="10" r="2.5" fill="#1f2124" />
            </svg>
          </span>
          Poké<span className="text-[color:var(--accent-gold)]">Help</span>
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
        <div className="relative z-10 h-[3px] bg-gradient-to-r from-[color:var(--shell-accent)] via-[color:var(--accent-gold)] to-[color:var(--shell-accent)]" />
      </div>

      {/* Mobile/tablet dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="more-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="pokecard w-full max-w-sm overflow-hidden"
              style={{ borderColor: "var(--accent-gold)" }}
            >
              <div className="h-2 bg-gradient-to-r from-[color:var(--shell-accent)] via-[color:var(--accent-gold)] to-[color:var(--shell-accent)]" />
              <div className="pattern-pokeball-dark bg-[color:var(--screen)] p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent-gold)] to-[color:var(--shell-accent)]">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="#1f2124" strokeWidth="2" />
                      <path d="M2 10h16" stroke="#1f2124" strokeWidth="2" />
                      <circle cx="10" cy="10" r="2.5" fill="#1f2124" />
                    </svg>
                  </span>
                  <p className="font-heading text-base text-[color:var(--ink)]">More features</p>
                </div>
                <ul className="space-y-1.5">
                  {NAV_ITEMS.filter((item) => !MOBILE_TAB_HREFS.includes(item.href)).map((item) => (
                    <li key={item.href}>
                      {item.comingSoon ? (
                        <span
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--ink)]/30"
                          title="Coming soon"
                        >
                          <NavIconBadge href={item.href} themeType={item.themeType} active={false} />
                          {item.label}
                          <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--ink)] transition-colors hover:bg-black/5"
                        >
                          <NavIconBadge href={item.href} themeType={item.themeType} active={pathname === item.href} />
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom tab bar — replaces top-right hamburger on phones/tablets */}
        <nav
          aria-label="Primary navigation (mobile)"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-black/20 bg-[color:var(--shell)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="grid grid-cols-6">
            {NAV_ITEMS.filter((item) => MOBILE_TAB_HREFS.includes(item.href)).map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex flex-col items-center gap-1 py-2.5"
                  >
                    <NavIconBadge href={item.href} themeType={item.themeType} active={isActive} />
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${isActive ? "text-[color:var(--screen)]" : "text-[color:var(--screen)]/50"}`}>
                      {item.mobileLabel ?? item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                className="flex w-full flex-col items-center gap-1 py-2.5"
              >
                <motion.span
                  whileTap={{ scale: 0.88 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    background: menuOpen
                      ? "radial-gradient(circle at 32% 28%, var(--accent-gold), #d9a300)"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: menuOpen ? "0 0 0 2px rgba(255,199,44,0.35), 0 3px 10px rgba(255,199,44,0.4)" : "none",
                    color: menuOpen ? "#1f2124" : "var(--screen)",
                    opacity: menuOpen ? 1 : 0.55,
                  }}
                >
                  <MoreIcon />
                </motion.span>
                <span className={`text-[10px] font-medium uppercase tracking-wide ${menuOpen ? "text-[color:var(--screen)]" : "text-[color:var(--screen)]/50"}`}>
                  More
                </span>
              </button>
            </li>
          </ul>
        </nav>
    </header>
  );
}