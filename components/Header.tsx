"use client";

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

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-black/20 bg-[color:var(--shell)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-lg font-semibold tracking-tight text-[color:var(--screen)]"
        >
          Poké<span className="text-[color:var(--shell-accent)]">Help</span>
        </Link>

        <nav aria-label="Main navigation" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex items-center gap-1 whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href} className="shrink-0">
                  {item.comingSoon ? (
                    <span
                      className="cursor-not-allowed rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--screen)]/30 sm:px-3 sm:text-xs"
                      title="Coming soon"
                    >
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors sm:px-3 sm:text-xs ${
                        isActive
                          ? "bg-[color:var(--shell-accent)] text-white"
                          : "text-[color:var(--screen)]/70 hover:bg-white/10 hover:text-[color:var(--screen)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}