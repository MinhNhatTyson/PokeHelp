"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AbilityInfo, AbilityNameEntry, MoveInfo, MoveNameEntry } from "@/lib/types";
import { fetchAbilityInfo, fetchAbilityNameList, fetchMoveInfo, fetchMoveNameList } from "@/lib/data/fetchAndCache";
import { TYPE_COLOR, TYPE_LABEL } from "@/lib/typeMeta";
import { MOVE_FLAG_META, getMoveQuickInfo, moveFlagsTrusted } from "@/lib/logic/moveFlags";
import { useListNav } from "@/lib/hooks/useListNav";
import { useBackdropStore } from "@/lib/store/backdropStore";
import TypeBadge from "@/components/TypeBadge";
import Skeleton from "@/components/Skeleton";
import Link from "next/link";   

const MAX_SUGGESTIONS = 8;
const CHIP_PREVIEW = 30;
const pretty = (slug: string) => slug.replace(/-/g, " ");

const CLASS_LABEL = { physical: "Physical", special: "Special", status: "Status" } as const;
const CLASS_STYLE = {
  physical: "bg-orange-600 text-white",
  special: "bg-sky-600 text-white",
  status: "bg-slate-500 text-white",
} as const;

const EXAMPLES = {
  move: ["protect", "fake-out", "close-combat", "trick-room"],
  ability: ["intimidate", "prankster", "drought", "levitate"],
} as const;

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg bg-black/5 p-3">
      <p className="text-xs uppercase text-[color:var(--ink)]/50">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--ink)]">{value ?? "—"}</p>
    </div>
  );
}

function NameChips({ items }: { items: { name: string; hidden?: boolean }[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, CHIP_PREVIEW);
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((i) => (
          <Link
            key={i.name}
            href={`/?pokemon=${i.name}`}
            className="btn-tactile rounded-full bg-black/10 px-2.5 py-1 text-xs capitalize text-[color:var(--ink)] hover:bg-black/20"
          >
            {pretty(i.name)}
            {i.hidden && <span className="ml-1 opacity-50">(hidden)</span>}
          </Link>
        ))}
      </div>
      {items.length > CHIP_PREVIEW && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="btn-tactile mt-2 min-h-[40px] rounded-full bg-black/10 px-4 text-xs font-medium text-[color:var(--ink)]"
        >
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </>
  );
}

const TONE = {
  on: "bg-[color:var(--shell-accent)] text-white",
  off: "bg-black/10 text-[color:var(--ink)]/70",
  info: "bg-[color:var(--shell)] text-[color:var(--screen)]",
} as const;
const SPREAD_TARGETS = new Set(["all-opponents", "all-other-pokemon"]);
const CLASS_SHORT = { physical: "Physical", special: "Special", status: "Status" } as const;

interface PropRow { key: string; label: string; note: string; tone: keyof typeof TONE }

function MoveProperties({ move }: { move: MoveInfo }) {
  const damaging = move.damageClass !== "status";
  const quick = getMoveQuickInfo(move.name);
  const flagsKnown = !!quick && moveFlagsTrusted();
  const rows: PropRow[] = [];

  if (quick && flagsKnown) {
    if (damaging && !quick.flags.includes("contact")) {
      rows.push({ key: "nocontact", label: "No contact", tone: "off", note: "Doesn't trigger Rough Skin, Rocky Helmet or other contact punishers." });
    }
    for (const f of quick.flags) {
      rows.push({ key: f, ...MOVE_FLAG_META[f], tone: f === "contact" ? "on" : "info" });
    }
  }
  if (damaging && SPREAD_TARGETS.has(move.target)) {
    rows.push({ key: "spread", label: "Spread", tone: "info", note: "Hits several targets; damage is ×0.75 when it connects with two or more." });
  }
  if (move.maxHits && move.maxHits > 1) {
    const min = move.minHits ?? move.maxHits;
    rows.push({
      key: "multi", tone: "info",
      label: min === move.maxHits ? `Hits ${move.maxHits}×` : `Hits ${min}–${move.maxHits}×`,
      note: "Each hit is rolled separately, so it gets through a Focus Sash or Sturdy and can trigger contact effects every hit.",
    });
  }
  if (move.drain > 0) rows.push({ key: "drain", label: `Drains ${move.drain}%`, tone: "info", note: "The user recovers that share of the damage dealt (Big Root boosts it)." });
  if (move.drain < 0) rows.push({ key: "recoil", label: `Recoil ${-move.drain}%`, tone: "off", note: "The user takes that share of the damage dealt. Rock Head and Magic Guard prevent it." });
  if (move.healing > 0) rows.push({ key: "heal", label: `Heals ${move.healing}%`, tone: "info", note: "Restores that share of the user's max HP." });
  if (move.critRate > 0) rows.push({ key: "crit", label: "High crit", tone: "info", note: "Raised critical-hit ratio." });
  if (move.flinchChance > 0) rows.push({ key: "flinch", label: `Flinch ${move.flinchChance}%`, tone: "info", note: "Can make a slower target flinch. Inner Focus, Shield Dust and Covert Cloak block it." });
  if (move.ailment) {
    rows.push({
      key: "ailment", tone: "info",
      label: `${pretty(move.ailment)}${move.ailmentChance > 0 ? ` ${move.ailmentChance}%` : ""}`,
      note: damaging ? "Secondary effect on the target." : "Applies the status to the target unless it is immune or protected.",
    });
  }

  if (rows.length === 0 && flagsKnown) return null;
  return (
    <div className="mt-4 border-t border-black/10 pt-3">
      <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Properties</p>
      {!flagsKnown && (
        <p className="mt-1.5 text-xs italic text-[color:var(--ink)]/50">
          Contact / sound / ball-bomb flags aren&apos;t available for this move.
        </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start gap-2">
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE[r.tone]}`}>
              {r.label}
            </span>
            <span className="pt-0.5 text-xs text-[color:var(--ink)]/70">{r.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Offline hint shown in the search dropdown: type dot, category and flags, before a move is even opened.
function MoveHint({ slug }: { slug: string }) {
  const q = getMoveQuickInfo(slug);
  if (!q) return null;
  const parts = [
    ...(q.category ? [CLASS_SHORT[q.category]] : []),
    ...(moveFlagsTrusted() ? q.flags.map((f) => MOVE_FLAG_META[f].label) : []),
  ];
  return (
    <span className="ml-3 flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase text-[color:var(--ink)]/50">
      {q.type && (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[q.type] }} title={TYPE_LABEL[q.type]} />
      )}
      {parts.join(" · ")}
    </span>
  );
}

export default function MoveAbilityExplorer() {
  const router = useRouter();
  const params = useSearchParams();
  const moveSlug = params.get("move");
  const abilitySlug = params.get("ability");
  const tab: "move" | "ability" = abilitySlug
    ? "ability"
    : moveSlug
    ? "move"
    : params.get("tab") === "ability"
    ? "ability"
    : "move";

  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [moveNames, setMoveNames] = useState<MoveNameEntry[]>([]);
  const [abilityNames, setAbilityNames] = useState<AbilityNameEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const setBackdrop = useBackdropStore((s) => s.setOverride);

  const [moveResult, setMoveResult] = useState<{ slug: string; info: MoveInfo | null } | null>(null);
  const [abilityResult, setAbilityResult] = useState<{ slug: string; info: AbilityInfo | null } | null>(null);
  const move = moveResult?.slug === moveSlug ? moveResult.info : null;
  const ability = abilityResult?.slug === abilitySlug ? abilityResult.info : null;
  const moveLoading = !!moveSlug && moveResult?.slug !== moveSlug;
  const abilityLoading = !!abilitySlug && abilityResult?.slug !== abilitySlug;

  useEffect(() => {
    fetchMoveNameList().then(setMoveNames);
    fetchAbilityNameList().then(setAbilityNames);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!moveSlug) return;
    let cancelled = false;
    fetchMoveInfo(moveSlug).then((info) => { if (!cancelled) setMoveResult({ slug: moveSlug, info }); });
    return () => { cancelled = true; };
  }, [moveSlug]);

  useEffect(() => {
    if (!abilitySlug) return;
    let cancelled = false;
    fetchAbilityInfo(abilitySlug).then((info) => { if (!cancelled) setAbilityResult({ slug: abilitySlug, info }); });
    return () => { cancelled = true; };
  }, [abilitySlug]);

  // The backdrop glow takes the selected move's type colour
  const moveType = tab === "move" ? move?.type ?? null : null;
  useEffect(() => { setBackdrop(moveType); }, [moveType, setBackdrop]);
  useEffect(() => () => setBackdrop(null), [setBackdrop]); // clear only when leaving the page

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "-");
    if (!q) return [];
    const list: { name: string }[] = tab === "move" ? moveNames : abilityNames;
    return [
      ...list.filter((n) => n.name.startsWith(q)),
      ...list.filter((n) => !n.name.startsWith(q) && n.name.includes(q)),
    ].slice(0, MAX_SUGGESTIONS);
  }, [query, tab, moveNames, abilityNames]);

  function select(name: string) {
    setQuery("");
    setShowDropdown(false);
    router.push(`/moves?${tab}=${name}`);
  }

  function switchTab(next: "move" | "ability") {
    if (next === tab && !moveSlug && !abilitySlug) return;
    setQuery("");
    setShowDropdown(false);
    router.push(`/moves?tab=${next}`);
  }

  const nav = useListNav({
    items: matches,
    isOpen: showDropdown && !!query.trim(),
    onSelect: (m) => select(m.name),
    onClose: () => setShowDropdown(false),
    onOpen: () => setShowDropdown(true),
  });

  const hasSelection = tab === "move" ? !!moveSlug : !!abilitySlug;

  return (
    <div className="w-full max-w-3xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-logo text-2xl sm:text-3xl text-[color:var(--ink)]">Moves &amp; Abilities</h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">Look up what a move or ability does and who can use it.</p>

        <div role="tablist" aria-label="Lookup type" className="mt-4 flex gap-1 rounded-lg bg-black/5 p-1">
          {([["move", "Moves"], ["ability", "Abilities"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => switchTab(key)}
              className={`min-h-[44px] flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === key ? "bg-white text-[color:var(--ink)] shadow-sm" : "text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div ref={containerRef} className="relative mt-4">
          <label htmlFor="move-ability-search" className="sr-only">
            Search for a {tab === "move" ? "move" : "ability"}
          </label>
          <input
            {...nav.inputProps}
            id="move-ability-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); nav.resetActive(); }}
            onFocus={() => setShowDropdown(true)}
            placeholder={tab === "move" ? "Search moves…" : "Search abilities…"}
            autoComplete="off"
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[color:var(--ink)] outline-none placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          {showDropdown && query.trim() && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
              {matches.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[color:var(--ink)]/50">No {tab === "move" ? "moves" : "abilities"} match &quot;{query}&quot;.</p>
              ) : (
                <div role="listbox" className="max-h-64 overflow-y-auto p-2">
                  {matches.map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => select(m.name)}
                      {...nav.optionProps(i)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] ${nav.activeIndex === i ? "bg-black/10" : "hover:bg-black/5"}`}
                    >
                      <span>{pretty(m.name)}</span>
                      {tab === "move" && <MoveHint slug={m.name} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!hasSelection && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Try</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EXAMPLES[tab].map((n) => (
                <button key={n} type="button" onClick={() => select(n)}
                  className="btn-tactile rounded-full bg-[color:var(--accent-gold)]/40 px-3 py-1 text-xs capitalize text-[color:var(--ink)]">
                  {pretty(n)}
                </button>
              ))}
            </div>
          </div>
        )}

        {(moveLoading || abilityLoading) && (
          <div role="status" aria-label="Loading" className="pokecard mt-6 p-5" style={{ borderColor: "var(--accent-gold)" }}>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-4 h-16 w-full" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
        )}

        {tab === "move" && moveSlug && !moveLoading && !move && (
          <p className="mt-4 text-sm text-red-500">Couldn&apos;t load &quot;{pretty(moveSlug)}&quot;. Try another search.</p>
        )}
        {tab === "ability" && abilitySlug && !abilityLoading && !ability && (
          <p className="mt-4 text-sm text-red-500">Couldn&apos;t load &quot;{pretty(abilitySlug)}&quot;. Try another search.</p>
        )}

        {tab === "move" && move && (
          <div className="pokecard mt-6" style={{ borderColor: move.type ? TYPE_COLOR[move.type] : "var(--accent-gold)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
              <h2 className="font-heading text-2xl capitalize text-[color:var(--ink)]">{pretty(move.name)}</h2>
              <div className="flex items-center gap-1.5">
                {move.type && <TypeBadge type={move.type} size="sm" />}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASS_STYLE[move.damageClass]}`}>
                  {CLASS_LABEL[move.damageClass]}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
              <Stat label="Power" value={move.power} />
              <Stat label="Accuracy" value={move.accuracy !== null ? `${move.accuracy}%` : null} />
              <Stat label="PP" value={move.pp} />
              <Stat label="Priority" value={move.priority > 0 ? `+${move.priority}` : move.priority} />
            </div>
            <div className="px-4 pb-4 text-[color:var(--ink)]">
              {move.effect && <p className="text-sm leading-relaxed">{move.effect}</p>}
              <p className="mt-3 text-xs text-[color:var(--ink)]/60">
                Target: <span className="font-medium capitalize">{pretty(move.target)}</span>
              </p>
              {move.learnedBy.length > 0 && (
                <div className="mt-4 border-t border-black/10 pt-3">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Learned by ({move.learnedBy.length})</p>
                  <NameChips key={move.name} items={move.learnedBy.map((name) => ({ name }))} />
                </div>
              )}
              <p className="mt-4 text-[11px] text-[color:var(--ink)]/40">
                Data from PokeAPI. Pokémon Champions balance changes may not be reflected.
              </p>
            </div>
            <MoveProperties move={move} />
          </div>
        )}

        {tab === "ability" && ability && (
          <div className="pokecard mt-6" style={{ borderColor: "var(--accent-gold)" }}>
            <div className="effect-banner" style={{ background: "linear-gradient(90deg, #b45309, #ffc72c)", color: "#1f2124" }}>
              <span>Ability</span>
            </div>
            <div className="p-4 text-[color:var(--ink)]">
              <h2 className="font-heading text-2xl capitalize">{pretty(ability.name)}</h2>
              {ability.shortEffect && <p className="mt-3 text-sm font-medium leading-relaxed">{ability.shortEffect}</p>}
              {ability.effect && ability.effect !== ability.shortEffect && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium uppercase text-[color:var(--ink)]/50">Full description</summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[color:var(--ink)]/80">{ability.effect}</p>
                </details>
              )}
              {ability.pokemon.length > 0 && (
                <div className="mt-4 border-t border-black/10 pt-3">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Pokémon with this ability ({ability.pokemon.length})</p>
                  <NameChips key={ability.name} items={ability.pokemon.map((p) => ({ name: p.name, hidden: p.isHidden }))} />
                </div>
              )}
              <p className="mt-4 text-[11px] text-[color:var(--ink)]/40">
                Data from PokeAPI. Pokémon Champions balance changes may not be reflected.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}