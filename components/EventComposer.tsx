"use client";

import { useEffect, useMemo, useState } from "react";
import { getCommonSet, describeMegaForm } from "@/lib/data/commonSets";
import { fetchMoveDetail, fetchMoveNameList } from "@/lib/data/fetchAndCache";
import { BattleEvent, FaintedMons, FieldState, MoveDetail, MoveNameEntry, StatusChange, StatusKind } from "@/lib/types";
import { useTeamStore } from "@/lib/store/teamStore";
import { useBattleSessionStore } from "@/lib/store/battleSessionStore";
import { useListNav } from "@/lib/hooks/useListNav";
import DamageSlider from "@/components/DamageSlider";

const MAX_MOVE_SUGGESTIONS = 8;
type Side = "yours" | "opponent";
type Mode = "move" | "switch" | "mega" | "faint" | "hp" | "status";
interface Participant { name: string; side: Side; fainted?: boolean; }

type Outcome =
  | { kind: "damage"; pct: number }
  | { kind: "worked" | "miss" | "protect" | "noeffect" };
type OutcomeKind = Outcome["kind"];

const DAMAGE_KINDS: { key: OutcomeKind; label: string }[] = [
  { key: "damage", label: "Damage" }, { key: "miss", label: "Missed" },
  { key: "protect", label: "Protected" }, { key: "noeffect", label: "No effect" },
];
const STATUS_KINDS: { key: OutcomeKind; label: string }[] = [
  { key: "worked", label: "Worked" }, { key: "miss", label: "Missed" },
  { key: "protect", label: "Protected" }, { key: "noeffect", label: "No effect" },
];
function makeOutcome(kind: OutcomeKind, prev?: Outcome): Outcome {
  if (kind === "damage") return { kind, pct: prev?.kind === "damage" ? prev.pct : 0 };
  return { kind };
}

// Protect-style moves: the only question is "did it work or fail?"
const GUARD_MOVES = new Set([
  "protect", "detect", "spiky-shield", "kings-shield", "baneful-bunker", "obstruct",
  "silk-trap", "burning-bulwark", "wide-guard", "quick-guard", "mat-block", "endure",
]);
// The user faints after using these
const SELF_FAINT_MOVES = new Set([
  "explosion", "self-destruct", "misty-explosion", "memento", "final-gambit", "healing-wish", "lunar-dance",
]);

const SELF_HEAL_MOVES: Record<string, number> = {
  recover: 50, roost: 50, "soft-boiled": 50, "slack-off": 50, "milk-drink": 50, "shore-up": 50,
  "heal-order": 50, synthesis: 50, moonlight: 50, "morning-sun": 50, rest: 100,
};
// Quick presets for the HP tab (% of max HP). pct null = you type the amount (e.g. recoil depends on damage dealt).
const HP_PRESETS = {
  heal: [
    { label: "Recover / Roost", pct: 50 }, { label: "Leftovers", pct: 6 }, { label: "Sitrus Berry", pct: 25 },
    { label: "Grassy Terrain", pct: 6 }, { label: "Drain move", pct: null }, { label: "Other", pct: null },
  ],
  loss: [
    { label: "Life Orb", pct: 10 }, { label: "Rocky Helmet", pct: 17 }, { label: "Rough Skin / Iron Barbs", pct: 13 },
    { label: "Sandstorm / Burn", pct: 6 }, { label: "Poison", pct: 13 }, { label: "Recoil", pct: null }, { label: "Other", pct: null },
  ],
} as const;

// Chip-damage statuses tracked by the store (confusion/flinch/etc. have no end-of-turn HP effect)
const STATUS_FROM_EFFECT: Record<string, StatusKind> = {
  Burn: "burn", Poison: "poison", Toxic: "toxic", Paralysis: "paralysis", Sleep: "sleep", Freeze: "freeze",
};
const TOXIC_MOVES = new Set(["toxic", "poison-fang"]); // PokeAPI lists these as plain "poison"
function statusFromEffect(effect: string, moveSlug: string): StatusKind | null {
  const k = STATUS_FROM_EFFECT[cap(effect.trim().toLowerCase())];
  if (!k) return null;
  return k === "poison" && TOXIC_MOVES.has(moveSlug) ? "toxic" : k;
}
const STATUS_OPTIONS: { key: StatusKind | "none"; label: string }[] = [
  { key: "burn", label: "Burn" }, { key: "poison", label: "Poison" }, { key: "toxic", label: "Bad poison" },
  { key: "paralysis", label: "Paralysis" }, { key: "sleep", label: "Sleep" }, { key: "freeze", label: "Freeze" },
  { key: "none", label: "Cure" },
];
const STATUS_VERB: Record<StatusKind, string> = {
  burn: "burned", poison: "poisoned", toxic: "badly poisoned", paralysis: "paralyzed", sleep: "put to sleep", freeze: "frozen",
};

const EFFECT_OPTIONS = [
  "Burn", "Paralysis", "Sleep", "Poison", "Toxic", "Freeze", "Confusion", "Flinch",
  "Helping Hand boost", "Skill Swap (abilities swapped)", "Redirected (Follow Me/Rage Powder)",
  "Protected", "Healed", "Stat change",
] as const;


// Field-setting moves update FieldStatusPanel's state directly instead of
// hitting a target — kept as a small curated map, same philosophy as
// abilitySignals.ts / itemSignals.ts.
type FieldSetterEffect =
  | { kind: "weather"; value: Exclude<FieldState["weather"], "none"> }
  | { kind: "terrain"; value: Exclude<FieldState["terrain"], "none"> }
  | { kind: "trick-room" }
  | { kind: "tailwind" };

const FIELD_SETTER_MOVES: Record<string, FieldSetterEffect> = {
  "sunny-day": { kind: "weather", value: "sun" },
  "rain-dance": { kind: "weather", value: "rain" },
  sandstorm: { kind: "weather", value: "sand" },
  snowscape: { kind: "weather", value: "snow" },
  hail: { kind: "weather", value: "snow" },
  "electric-terrain": { kind: "terrain", value: "electric" },
  "grassy-terrain": { kind: "terrain", value: "grassy" },
  "misty-terrain": { kind: "terrain", value: "misty" },
  "psychic-terrain": { kind: "terrain", value: "psychic" },
  "trick-room": { kind: "trick-room" },
  tailwind: { kind: "tailwind" },
};

const NO_TARGET_API_VALUES = new Set(["user", "users-field", "entire-field", "all-pokemon", "opponents-field", "all-allies", "user-and-allies"]);
const SINGLE_TARGET_API_VALUES = new Set(["selected-pokemon", "ally", "random-opponent"]);
const AUTO_MULTI_TARGET_API_VALUES = new Set(["all-other-pokemon", "all-opponents", "all-adjacent-foes", "all-adjacent"]);

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatMoveName(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function describeOutcome(o: Outcome, target: string, hpBefore: number): string {
  switch (o.kind) {
    case "miss": return `missed ${cap(target)}`;
    case "protect": return `was blocked by ${cap(target)}'s Protect`;
    case "noeffect": return `had no effect on ${cap(target)}`;
    case "worked": return `landed on ${cap(target)}`;
    case "damage":
      return o.pct >= hpBefore
        ? `dealt enough damage to KO ${cap(target)}`
        : `took ${cap(target)} from ${hpBefore}% to ${hpBefore - o.pct}% HP`;
  }
}
function targetCandidates(apiTarget: string, actorSide: Side, others: Participant[]): Participant[] {
  if (apiTarget === "ally") return others.filter((p) => p.side === actorSide);
  return others;
}
function defaultTargets(apiTarget: string, actorSide: Side, others: Participant[]): string[] {
  if (apiTarget === "all-other-pokemon") return others.map((p) => p.name);
  if (AUTO_MULTI_TARGET_API_VALUES.has(apiTarget)) return others.filter((p) => p.side !== actorSide).map((p) => p.name);
  return [];
}

export default function EventComposer({
  participants,
  yourTeamNames,
  opponentTeamNames,
  fainted,
  onConfirm,
  onSwitch,
  onCancel,
  initialMode, initialActor,
}: {
  participants: Participant[]; // currently active battlers only (2 + 2)
  yourTeamNames: string[]; // your bring-4
  opponentTeamNames: string[]; // opponent's known team-preview roster
  fainted: FaintedMons;
  onConfirm: (fragment: string, extra?: Pick<BattleEvent, "switch" | "faint" | "damage" | "status">) => void;
  onSwitch: (side: Side, outgoingName: string, incomingName: string) => void;
  onCancel: () => void;
  initialMode?: Mode;
  initialActor?: string | null;
}) {
  const teamSlots = useTeamStore((s) => s.slots);
  const fieldState = useBattleSessionStore((s) => s.fieldState);
  const setFieldState = useBattleSessionStore((s) => s.setFieldState);

  const hp = useBattleSessionStore((s) => s.hp);
  const hpOfName = (name: string) => {
    const side = participants.find((p) => p.name === name)?.side;
    return side ? hp[side][name] ?? 100 : 100;
  };
  const statusState = useBattleSessionStore((s) => s.status);
  const statusOf = (side: Side, name: string): StatusKind | null => statusState[side][name] ?? null;

  const [mode, setMode] = useState<Mode>(initialMode ?? "move");
  const [actor, setActor] = useState<string | null>(initialActor ?? null);
  const [moveSlug, setMoveSlug] = useState("");
  const [detailResult, setDetailResult] = useState<{ slug: string; detail: MoveDetail | null } | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [targetOutcomes, setTargetOutcomes] = useState<Record<string, Outcome>>({});
  const [selfOutcome, setSelfOutcome] = useState<"worked" | "failed">("worked");
  const [selfHeal, setSelfHeal] = useState(0);
  const [hpDir, setHpDir] = useState<"heal" | "loss">("heal");
  const [hpAmount, setHpAmount] = useState(0);
  const [hpSource, setHpSource] = useState<string | null>(null);
  const [statusPick, setStatusPick] = useState<StatusKind | "none" | null>(null);
  const [effectChoice, setEffectChoice] = useState<string | null>(null);
  const [effectOther, setEffectOther] = useState("");
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const [moveText, setMoveText] = useState("");
  const [moveNames, setMoveNames] = useState<MoveNameEntry[]>([]);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);

  const actorP = participants.find((p) => p.name === actor) ?? null;
  const curStatus = actorP ? statusOf(actorP.side, actorP.name) : null;
  const canConfirmStatus = !!statusPick && (statusPick === "none" ? !!curStatus : statusPick !== curStatus);
  const alive = participants.filter((p) => !p.fainted);
  const others = alive.filter((p) => p.name !== actor);
  const fieldSetter = moveSlug ? FIELD_SETTER_MOVES[moveSlug] : undefined;
  const isGuard = GUARD_MOVES.has(moveSlug);
  const moveDetail = detailResult && detailResult.slug === moveSlug && !fieldSetter ? detailResult.detail : null;
  const moveDetailStatus: "idle" | "loading" | "error" =
    !moveSlug || fieldSetter ? "idle"
    : !detailResult || detailResult.slug !== moveSlug ? "loading"
    : detailResult.detail ? "idle" : "error";

  // Real movepool for your own mons (Team Builder's chosen 4); curated common
  // moves for the opponent's, since we never know their real moveset.
  const movepool = useMemo(() => {
    if (!actorP) return [];
    if (actorP.side === "yours") {
      const slot = teamSlots.find((s) => s.pokemon?.name === actorP.name);
      return (slot?.moves.filter((m): m is string => m !== null)) ?? [];
    }
    return getCommonSet(actorP.name)?.commonMoves.map((m) => m.toLowerCase().replace(/\s+/g, "-")) ?? [];
  }, [actorP, teamSlots]);

  const moveMatches = useMemo(() => {
    const q = moveText.trim().toLowerCase().replace(/\s+/g, "-");
    if (!q) return [];
    return moveNames.filter((m) => m.name.startsWith(q)).slice(0, MAX_MOVE_SUGGESTIONS);
  }, [moveText, moveNames]);

  function changeMode(next: Mode) {
    setMode(next);
    // A fainted Pokémon can only be picked in Switch mode (to send in its replacement)
    if (next !== "switch" && actorP?.fainted) {
      resetMoveState();
      setActor(null);
      setMoveSlug("");
      setMoveText("");
      setSwitchTo(null);
    }
  }

  function resetMoveState() {
    setSelectedTargets([]);
    setTargetOutcomes({});
    setSelfOutcome("worked");
    setEffectChoice(null);
    setEffectOther("");
    setSelfHeal(0);
  }
  function selectMove(slug: string) {
    resetMoveState();
    setMoveSlug(slug);
    const cur = actor ? hpOfName(actor) : 100;
    setSelfHeal(Math.min(SELF_HEAL_MOVES[slug] ?? 0, 100 - cur));
  }
  function selectActor(name: string) { resetMoveState(); setActor(name); setMoveSlug(""); setMoveText(""); setSwitchTo(null); setHpAmount(0); setHpSource(null); setStatusPick(null);}

  useEffect(() => {
    if (!moveSlug || FIELD_SETTER_MOVES[moveSlug]) return;
    let cancelled = false;
    fetchMoveDetail(moveSlug)
      .then((detail) => {
        if (cancelled) return;
        setDetailResult({ slug: moveSlug, detail });
        if (detail?.ailment && detail.damageClass === "status") {
          const match = EFFECT_OPTIONS.find((o) => o.toLowerCase() === detail.ailment);
          setEffectChoice(match ?? cap(detail.ailment));
        }
        if (detail && actorP) {
          const candidates = targetCandidates(detail.target, actorP.side, others);
          setSelectedTargets(
            SINGLE_TARGET_API_VALUES.has(detail.target) && candidates.length === 1
              ? [candidates[0].name]
              : defaultTargets(detail.target, actorP.side, others)
          );
        }
      })
      .catch(() => { if (!cancelled) setDetailResult({ slug: moveSlug, detail: null }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSlug]);

  useEffect(() => {
    const trimmed = moveText.trim();
    if (!trimmed) return;
    const handle = setTimeout(() => {
      selectMove(trimmed.toLowerCase().replace(/\s+/g, "-"));
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveText]);

  useEffect(() => {
    fetchMoveNameList().then(setMoveNames);
  }, []);

  const isStatusMove = !fieldSetter && moveDetail?.damageClass === "status";
  const noTargetUI = !!fieldSetter || isGuard || (moveDetail ? NO_TARGET_API_VALUES.has(moveDetail.target) : false);
  const isSelfMove = !fieldSetter && noTargetUI; 
  const singleTarget = moveDetail ? SINGLE_TARGET_API_VALUES.has(moveDetail.target) : false;
  const candidates = actorP && moveDetail ? targetCandidates(moveDetail.target, actorP.side, others) : others;
  const outcomeOf = (t: string): Outcome =>
    targetOutcomes[t] ?? (isStatusMove ? { kind: "worked" } : { kind: "damage", pct: 0 });

  function toggleTarget(name: string) {
    setSelectedTargets((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (singleTarget) return [name];
      return [...prev, name];
    });
  }

  function handleConfirm() {
    if (!actor || !actorP) return;

    if (mode === "switch") {
      if (!switchTo) return;
      onSwitch(actorP.side, actor, switchTo);
      const text = actorP.fainted
        ? `${cap(switchTo)} was sent in to replace fainted ${cap(actor)}`
        : `${cap(actor)} switched out for ${cap(switchTo)}`;
      onConfirm(text, { switch: { side: actorP.side, out: actor, in: switchTo } });
      return;
    }

    if (mode === "faint") {
      onConfirm(`${cap(actor)} fainted`, { faint: [{ side: actorP.side, name: actor }] });
      return;
    }

    if (mode === "hp") {
      if (hpAmount <= 0) return;
      const heal = hpDir === "heal";
      const before = hpOfName(actor);
      const after = heal ? before + hpAmount : before - hpAmount;
      const src = hpSource ? ` (${hpSource})` : "";
      const text = heal
        ? `${cap(actor)} recovered HP${src}, going from ${before}% to ${after}%`
        : after <= 0
        ? `${cap(actor)} fainted from HP loss${src}`
        : `${cap(actor)} lost HP${src}, going from ${before}% to ${after}%`;
      onConfirm(text, { damage: [{ side: actorP.side, name: actor, pct: heal ? -hpAmount : hpAmount }] });
      return;
    }

    if (mode === "status") {
      if (!statusPick) return;
      const next = statusPick === "none" ? null : statusPick;
      if (next === curStatus) return;
      const text = next ? `${cap(actor)} was ${STATUS_VERB[next]}` : `${cap(actor)}'s ${curStatus} was cured`;
      onConfirm(text, { status: [{ side: actorP.side, name: actor, prev: curStatus, next }] });
      return;
    }

    if (mode === "mega") {
      const form = describeMegaForm(actor);
      if (form) onConfirm(`${cap(actor)} Mega Evolved into ${form}`);
      return;
    }

    if (!moveSlug) return;
    const moveLabel = formatMoveName(moveSlug);

    if (fieldSetter) {
      if (fieldSetter.kind === "weather") setFieldState({ weather: fieldSetter.value, weatherTurnsLeft: 5 });
      else if (fieldSetter.kind === "terrain") setFieldState({ terrain: fieldSetter.value, terrainTurnsLeft: 5 });
      else if (fieldSetter.kind === "trick-room") setFieldState({ trickRoomTurnsLeft: 5 });
      else if (fieldSetter.kind === "tailwind") {
        const key = actorP.side === "yours" ? "yours" : "opponents";
        setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, [key]: 4 } });
      }
      onConfirm(`${cap(actor)} used ${moveLabel}, setting up the field`);
      return;
    }

    const effect = effectChoice ?? (effectOther.trim() || null);
    const selfFaint = SELF_FAINT_MOVES.has(moveSlug) ? [{ side: actorP.side, name: actor }] : [];

    if (isSelfMove) {
      const heal = selfOutcome === "worked" && SELF_HEAL_MOVES[moveSlug] ? selfHeal : 0;
      const before = hpOfName(actor);
      const text =
        selfOutcome === "failed" ? `${cap(actor)} used ${moveLabel} but it failed`
        : isGuard ? `${cap(actor)} used ${moveLabel} and it worked`
        : heal > 0 ? `${cap(actor)} used ${moveLabel}, restoring HP from ${before}% to ${before + heal}%`
        : `${cap(actor)} used ${moveLabel}`;
      onConfirm(text, {
        ...(selfFaint.length > 0 ? { faint: selfFaint } : {}),
        ...(heal > 0 ? { damage: [{ side: actorP.side, name: actor, pct: -heal }] } : {}),
      });
      return;
    }

    if (selectedTargets.length === 0) return;
    const outcomes = selectedTargets.map((t) => ({ t, o: outcomeOf(t) }));
    const parts = outcomes.map(({ t, o }) => `${moveLabel} ${describeOutcome(o, t, hpOfName(t))}`);
    const landed = outcomes.some(({ o }) => o.kind === "damage" || o.kind === "worked");

    const statusKind = effect ? statusFromEffect(effect, moveSlug) : null;
    const statusChanges: StatusChange[] = [];
    const alreadyStatused: string[] = [];
    if (statusKind) {
      for (const { t, o } of outcomes) {
        if (o.kind !== "damage" && o.kind !== "worked") continue;
        const side = participants.find((p) => p.name === t)?.side;
        if (!side) continue;
        if (statusOf(side, t)) alreadyStatused.push(t);
        else statusChanges.push({ side, name: t, prev: null, next: statusKind });
      }
    }

    let fragment = `${cap(actor)}'s ${parts.join("; ")}`;
    if (effect && landed) fragment += `, causing ${effect.toLowerCase()}`;
    if (alreadyStatused.length > 0) fragment += ` (${alreadyStatused.map((n) => cap(n)).join(", ")} already had a status condition)`;
    if (selfFaint.length > 0) fragment += `; ${cap(actor)} fainted`;

    const damage = outcomes.flatMap(({ t, o }) => {
      const side = participants.find((p) => p.name === t)?.side;
      return o.kind === "damage" && side ? [{ side, name: t, pct: o.pct }] : [];
    });
    onConfirm(fragment, { damage, faint: selfFaint, status: statusChanges });
  }

  const moveNav = useListNav({
    items: moveMatches,
    isOpen: showMoveDropdown,
    onSelect: (m) => { selectMove(m.name); setMoveText(""); setShowMoveDropdown(false); },
    onClose: () => setShowMoveDropdown(false),
    onOpen: () => setShowMoveDropdown(true),
  });

  const canConfirmMove =
    mode === "move" &&
    !!moveSlug &&
    (!!fieldSetter ||
      isSelfMove ||
      (selectedTargets.length > 0 &&
        selectedTargets.every((t) => {
          const o = outcomeOf(t);
          return o.kind !== "damage" || o.pct > 0;
        })));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[color:var(--screen)] p-5 sm:rounded-2xl">
        <div className="flex gap-1 rounded-lg bg-black/5 p-1">
          {([["move", "Move"], ["switch", "Switch"], ["mega", "Mega"], ["hp", "HP"], ["status", "Status"], ["faint", "Faint"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeMode(key)}
              className={`min-h-[44px] flex-1 rounded-md px-1 py-2 text-xs sm:text-sm font-medium ${mode === key ? "bg-white shadow-sm" : "opacity-50"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
            {mode === "switch" ? "Who is leaving (tap a fainted one to send in its replacement)" : mode === "faint" ? "Who fainted" : mode === "hp" ? "Whose HP changed" : mode === "status" ? "Whose status changed" : "Who acted (currently on the field)"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(mode === "switch" ? participants : alive).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { selectActor(p.name); setMoveSlug(""); setMoveText(""); setSwitchTo(null); }}
                className={`min-h-[40px] rounded-full px-4 py-2 text-sm capitalize ${actor === p.name ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"} ${p.fainted ? "line-through opacity-70" : ""}`}
              >
                {p.name}
                {p.fainted && <span className="ml-1.5 text-[10px] font-semibold uppercase no-underline">fainted</span>}
              </button>
            ))}
          </div>
        </div>

        {mode === "move" ? (
          actor && (
            <>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Move</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {movepool.length === 0 && <p className="text-xs text-[color:var(--ink)]/40">No known moves — pick a species/moveset in Team Builder, or this is an opponent with no curated data.</p>}
                  {movepool.map((m) => (
                    <button key={m} type="button" onClick={() => { selectMove(m); setMoveText(""); }} className={`min-h-[40px] rounded-full px-4 py-2 text-sm ${moveSlug === m ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}>
                      {formatMoveName(m)}
                    </button>
                  ))}
                </div>
                <div className="relative mt-2">
                  <input
                    {...moveNav.inputProps}
                    value={moveText}
                    onChange={(e) => { setMoveText(e.target.value); setShowMoveDropdown(true); moveNav.resetActive(); }}
                    onFocus={() => setShowMoveDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMoveDropdown(false), 150)}
                    placeholder="Or type a move name (e.g. Expanding Force)…"
                    autoComplete="off"
                    className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none"
                  />
                  {showMoveDropdown && moveMatches.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg">
                      {moveMatches.map((m) => (
                        <button
                          {...moveNav.optionProps(moveMatches.indexOf(m))}
                          key={m.name}
                          type="button"
                          onMouseDown={() => { selectMove(m.name); setMoveText(""); setShowMoveDropdown(false); }}
                          className={`block w-full rounded-md px-2 py-1 text-left text-sm capitalize text-[color:var(--ink)] ${moveNav.activeIndex === moveMatches.indexOf(m) ? "bg-black/10" : "hover:bg-black/5"}`}
                        >
                          {formatMoveName(m.name)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {moveSlug && !fieldSetter && (
                  <p className="mt-1 text-xs text-[color:var(--ink)]/50">
                    {moveDetailStatus === "loading" && "Looking up move data…"}
                    {moveDetailStatus === "error" && "Couldn't verify this move — check the spelling."}
                    {moveDetailStatus === "idle" && moveDetail && `${formatMoveName(moveSlug)} · ${moveDetail.damageClass}${moveDetail.ailment ? ` · ${moveDetail.ailment}` : ""}`}
                  </p>
                )}
              </div>

              {moveSlug && !fieldSetter && !noTargetUI && moveDetail && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
                    {singleTarget ? "Target" : "Target(s)"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {candidates.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => toggleTarget(p.name)}
                        className={`min-h-[40px] rounded-full px-4 py-2 text-sm capitalize ${selectedTargets.includes(p.name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isSelfMove && moveSlug && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Result</p>
                  <div role="radiogroup" className="mt-1.5 grid grid-cols-2 gap-2">
                    {([["worked", isGuard ? "Protected" : "Worked"], ["failed", "Failed"]] as const).map(([key, label]) => (
                      <button
                        key={key} type="button" role="radio" aria-checked={selfOutcome === key}
                        onClick={() => setSelfOutcome(key)}
                        className={`btn-tactile min-h-[48px] rounded-xl text-sm font-semibold ${
                          selfOutcome === key
                            ? key === "worked" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                            : "bg-black/10 text-[color:var(--ink)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {isGuard && (
                    <p className="mt-1.5 text-[11px] text-[color:var(--ink)]/50">
                      Protect-style moves fail when used on consecutive turns.
                    </p>
                  )}
                  {selfOutcome === "worked" && SELF_HEAL_MOVES[moveSlug] && actor && (
                    hpOfName(actor) >= 100 ? (
                      <p className="mt-2 text-[11px] text-[color:var(--ink)]/50">{cap(actor)} is already at full HP.</p>
                    ) : (
                      <DamageSlider heal current={hpOfName(actor)} max={100 - hpOfName(actor)} value={selfHeal} onChange={setSelfHeal} targetName={actor} />
                    )
                  )}
                </div>
              )}

              {!fieldSetter && !isSelfMove && selectedTargets.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Result per target</p>
                  {selectedTargets.map((t) => {
                    const o = outcomeOf(t);
                    const current = hpOfName(t);
                    return (
                      <div key={t} className="rounded-lg border border-black/10 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium capitalize text-[color:var(--ink)]">{t}</span>
                          <span className="text-[11px] tabular-nums text-[color:var(--ink)]/50">{current}% HP</span>
                        </div>
                        <div role="radiogroup" aria-label={`Result on ${t}`} className="mt-2 flex flex-wrap gap-1.5">
                          {(isStatusMove ? STATUS_KINDS : DAMAGE_KINDS).map((k) => (
                            <button
                              key={k.key} type="button" role="radio" aria-checked={o.kind === k.key}
                              onClick={() => setTargetOutcomes((prev) => ({ ...prev, [t]: makeOutcome(k.key, prev[t]) }))}
                              className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-medium ${
                                o.kind === k.key ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"
                              }`}
                            >
                              {k.label}
                            </button>
                          ))}
                        </div>
                        {o.kind === "damage" && (
                          <DamageSlider
                            value={o.pct} max={current} targetName={t}
                            onChange={(pct) => setTargetOutcomes((prev) => ({ ...prev, [t]: { kind: "damage", pct } }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!fieldSetter && !isSelfMove && (isStatusMove || moveDetail?.ailment) && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
                    {isStatusMove ? "Effect applied" : "Secondary effect (optional)"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {EFFECT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEffectChoice(effectChoice === opt ? null : opt)}
                        className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs ${effectChoice === opt ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <input
                    value={effectOther}
                    onChange={(e) => { setEffectOther(e.target.value); if (e.target.value) setEffectChoice(null); }}
                    placeholder="Or describe the effect…"
                    className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none"
                  />
                </div>
              )}
            </>
          )
        ) : mode === "switch" ? (          
          actor && actorP && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Switched in</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(() => {
                  const bench = (actorP.side === "yours" ? yourTeamNames : opponentTeamNames).filter(
                    (name) => !participants.some((p) => p.name === name) && !fainted[actorP.side].includes(name)
                  );
                  if (bench.length === 0) return <p className="text-xs text-[color:var(--ink)]/50">No Pokémon left to send in.</p>;
                  return bench.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSwitchTo(name)}
                      className={`min-h-[40px] rounded-full px-4 py-2 text-sm capitalize ${switchTo === name ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                    >
                      {name}
                    </button>
                  ));
                })()}
              </div>
            </div>
          )
        ) : mode === "status" ? (
          actor && actorP && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
                Status condition{curStatus ? ` · currently ${curStatus === "toxic" ? "badly poisoned" : curStatus}` : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.filter((o) => o.key !== "none" || curStatus).map((o) => (
                  <button
                    key={o.key} type="button" aria-pressed={statusPick === o.key}
                    onClick={() => setStatusPick(o.key)}
                    className={`min-h-[40px] rounded-full px-4 py-2 text-sm ${
                      statusPick === o.key ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"
                    } ${o.key === curStatus ? "opacity-40" : ""}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[color:var(--ink)]/50">
                Status from a logged move is recorded automatically. Use this tab for anything else (Toxic Spikes, Flame Orb, Natural Cure, Lum Berry…).
                Burn and poison tick at the end of every turn.
              </p>
            </div>
          )
        ) : mode === "hp" ? (
          actor && actorP && (
            <div className="mt-4">
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {([["heal", "Heal"], ["loss", "Lose HP"]] as const).map(([key, label]) => (
                  <button
                    key={key} type="button" role="radio" aria-checked={hpDir === key}
                    onClick={() => { setHpDir(key); setHpAmount(0); setHpSource(null); }}
                    className={`btn-tactile min-h-[44px] rounded-xl text-sm font-semibold ${
                      hpDir === key ? (key === "heal" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "bg-black/10 text-[color:var(--ink)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs font-medium uppercase text-[color:var(--ink)]/40">Source (optional)</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {HP_PRESETS[hpDir].map((p) => {
                  const cur = hpOfName(actor);
                  const room = hpDir === "heal" ? 100 - cur : cur;
                  return (
                    <button
                      key={p.label} type="button"
                      onClick={() => { setHpSource(p.label); if (p.pct !== null) setHpAmount(Math.min(p.pct, room)); }}
                      className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs ${hpSource === p.label ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}
                    >
                      {p.label}{p.pct !== null && <span className="ml-1 opacity-60">{p.pct}%</span>}
                    </button>
                  );
                })}
              </div>

              {(hpDir === "heal" ? 100 - hpOfName(actor) : hpOfName(actor)) <= 0 ? (
                <p className="mt-3 rounded-md bg-black/5 px-3 py-2 text-sm text-[color:var(--ink)]/70">
                  {cap(actor)} is already at full HP.
                </p>
              ) : (
                <DamageSlider
                  heal={hpDir === "heal"} current={hpOfName(actor)}
                  max={hpDir === "heal" ? 100 - hpOfName(actor) : hpOfName(actor)}
                  value={hpAmount} onChange={setHpAmount} targetName={actor}
                />
              )}
              <p className="mt-2 text-[11px] text-[color:var(--ink)]/50">
                Recoil and drain depend on the damage dealt, so slide the amount. Leftovers, Black Sludge, Sitrus-type berries, status and weather chip are automatic. Only log them here if the item isn&apos;t set, or you&apos;ll double count.
              </p>
            </div>
          )
        ) : mode === "faint" ? (
          actor && (
            <p className="mt-4 rounded-md bg-black/5 px-3 py-2 text-sm text-[color:var(--ink)]/70">
              Marks {actor} as fainted. Use this for recoil, weather, status, Perish Song, or any faint not caused by a move you logged. A KO from a move is recorded automatically when you pick &quot;100% / KO&quot;.
            </p>
          )
        ) : (
          actor && (
            <p className="mt-4 rounded-md bg-black/5 px-3 py-2 text-sm text-[color:var(--ink)]/70">
              {describeMegaForm(actor) ?? "No known Mega form for this Pokémon."}
            </p>
          )
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-tactile min-h-[48px] flex-1 rounded-md bg-black/10 px-3 text-sm font-medium text-[color:var(--ink)]">Cancel</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={mode === "switch" ? !switchTo : mode === "faint" ? !actor : mode === "status" ? !actor || !canConfirmStatus : mode === "hp" ? !actor || hpAmount <= 0 : mode === "mega" ? !actor || !describeMegaForm(actor) : !canConfirmMove}
            className="btn-tactile btn-glow-accent min-h-[48px] flex-1 rounded-md bg-[color:var(--shell-accent)] px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add event
          </button>
        </div>
      </div>
    </div>
  );
}