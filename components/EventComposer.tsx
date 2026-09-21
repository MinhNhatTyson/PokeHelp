"use client";

import { useEffect, useMemo, useState } from "react";
import { getCommonSet } from "@/lib/data/commonSets";
import { fetchMoveDetail, fetchMoveNameList } from "@/lib/data/fetchAndCache";
import { FieldState, MoveDetail, MoveNameEntry } from "@/lib/types";
import { useTeamStore } from "@/lib/store/teamStore";
import { useBattleSessionStore } from "@/lib/store/battleSessionStore";

const MAX_MOVE_SUGGESTIONS = 8;
type Side = "yours" | "opponent";
interface Participant { name: string; side: Side; }

const RESULT_OPTIONS = [
  { key: "25", label: "25%" },
  { key: "50", label: "50%" },
  { key: "75", label: "75%" },
  { key: "ko", label: "100% / KO" },
  { key: "miss", label: "Missed" },
  { key: "protect", label: "Protected" },
  { key: "noeffect", label: "No effect" },
] as const;
type ResultKey = (typeof RESULT_OPTIONS)[number]["key"];

const EFFECT_OPTIONS = [
  "Burn", "Paralysis", "Sleep", "Poison", "Freeze", "Confusion", "Flinch",
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

const NO_TARGET_API_VALUES = new Set(["user", "users-field", "entire-field", "all-pokemon"]);
const SINGLE_TARGET_API_VALUES = new Set(["selected-pokemon", "ally", "random-opponent"]);
const AUTO_MULTI_TARGET_API_VALUES = new Set(["all-other-pokemon", "all-opponents", "all-adjacent-foes", "all-adjacent"]);

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatMoveName(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function describeResult(result: ResultKey, target: string): string {
  switch (result) {
    case "miss": return `missed ${cap(target)}`;
    case "protect": return `was blocked by ${cap(target)}'s Protect`;
    case "noeffect": return `had no effect on ${cap(target)}`;
    case "ko": return `dealt enough damage to KO ${cap(target)}`;
    default: return `dealt around ${result}% damage to ${cap(target)}`;
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
  onConfirm,
  onSwitch,
  onCancel,
}: {
  participants: Participant[]; // currently active battlers only (2 + 2)
  yourTeamNames: string[]; // your bring-4
  opponentTeamNames: string[]; // opponent's known team-preview roster
  onConfirm: (fragment: string) => void;
  onSwitch: (side: Side, outgoingName: string, incomingName: string) => void;
  onCancel: () => void;
}) {
  const teamSlots = useTeamStore((s) => s.slots);
  const fieldState = useBattleSessionStore((s) => s.fieldState);
  const setFieldState = useBattleSessionStore((s) => s.setFieldState);

  const [mode, setMode] = useState<"move" | "switch">("move");
  const [actor, setActor] = useState<string | null>(null);
  const [moveSlug, setMoveSlug] = useState("");
  const [moveDetail, setMoveDetail] = useState<MoveDetail | null>(null);
  const [moveDetailStatus, setMoveDetailStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [targetResults, setTargetResults] = useState<Record<string, ResultKey>>({});
  const [effectChoice, setEffectChoice] = useState<string | null>(null);
  const [effectOther, setEffectOther] = useState("");
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const [moveText, setMoveText] = useState("");
  const [moveNames, setMoveNames] = useState<MoveNameEntry[]>([]);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);

  const actorP = participants.find((p) => p.name === actor) ?? null;
  const others = participants.filter((p) => p.name !== actor);
  const fieldSetter = moveSlug ? FIELD_SETTER_MOVES[moveSlug] : undefined;

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

  // Reset move-specific state whenever the actor or move changes.
  useEffect(() => {
    setSelectedTargets([]);
    setTargetResults({});
    setEffectChoice(null);
    setEffectOther("");
  }, [actor, moveSlug]);

  useEffect(() => {
    if (!moveSlug || FIELD_SETTER_MOVES[moveSlug]) {
      setMoveDetail(null);
      setMoveDetailStatus("idle");
      return;
    }
    let cancelled = false;
    setMoveDetailStatus("loading");
    fetchMoveDetail(moveSlug)
      .then((detail) => {
        if (cancelled) return;
        setMoveDetail(detail);
        setMoveDetailStatus(detail ? "idle" : "error");
        if (detail?.ailment) {
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
      .catch(() => { if (!cancelled) setMoveDetailStatus("error"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSlug]);

  useEffect(() => {
    const trimmed = moveText.trim();
    if (!trimmed) return;
    const handle = setTimeout(() => {
      setMoveSlug(trimmed.toLowerCase().replace(/\s+/g, "-"));
    }, 350);
    return () => clearTimeout(handle);
  }, [moveText]);

  useEffect(() => {
    fetchMoveNameList().then(setMoveNames);
  }, []);

  const isStatusMove = !fieldSetter && moveDetail?.damageClass === "status";
  const noTargetUI = !!fieldSetter || (moveDetail ? NO_TARGET_API_VALUES.has(moveDetail.target) : false);
  const singleTarget = moveDetail ? SINGLE_TARGET_API_VALUES.has(moveDetail.target) : false;
  const candidates = actorP && moveDetail ? targetCandidates(moveDetail.target, actorP.side, others) : others;

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
      onConfirm(`${cap(actor)} switched out for ${cap(switchTo)}`);
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

    if (isStatusMove) {
      const targetsText = selectedTargets.length > 0 ? ` on ${selectedTargets.map(cap).join(" and ")}` : "";
      onConfirm(effect ? `${cap(actor)} used ${moveLabel}${targetsText}, causing ${effect}` : `${cap(actor)} used ${moveLabel}${targetsText}`);
      return;
    }

    if (noTargetUI) {
      onConfirm(`${cap(actor)} used ${moveLabel}`);
      return;
    }

    if (selectedTargets.length === 0) return;
    const parts = selectedTargets
      .map((t) => (targetResults[t] ? `${moveLabel} ${describeResult(targetResults[t], t)}` : null))
      .filter((p): p is string => p !== null);
    if (parts.length === 0) return;

    let fragment = `${cap(actor)}'s ${parts.join("; ")}`;
    if (effect) fragment += `, ${effect.toLowerCase()}`;
    onConfirm(fragment);
  }

  const canConfirmMove =
    mode === "move" &&
    !!moveSlug &&
    (fieldSetter ||
      noTargetUI ||
      isStatusMove ||
      (selectedTargets.length > 0 && selectedTargets.every((t) => targetResults[t])));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[color:var(--screen)] p-5 sm:rounded-2xl">
        <div className="flex gap-1 rounded-lg bg-black/5 p-1">
          <button type="button" onClick={() => setMode("move")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "move" ? "bg-white shadow-sm" : "opacity-50"}`}>Move</button>
          <button type="button" onClick={() => setMode("switch")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "switch" ? "bg-white shadow-sm" : "opacity-50"}`}>Switch</button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Who acted (currently on the field)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { setActor(p.name); setMoveSlug(""); setMoveText(""); setSwitchTo(null); }}
                className={`rounded-full px-3 py-1 text-sm capitalize ${actor === p.name ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
              >
                {p.name}
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
                    <button key={m} type="button" onClick={() => { setMoveSlug(m); setMoveText(""); }} className={`rounded-full px-3 py-1 text-sm ${moveSlug === m ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}>
                      {formatMoveName(m)}
                    </button>
                  ))}
                </div>
                <div className="relative mt-2">
                  <input
                    value={moveText}
                    onChange={(e) => { setMoveText(e.target.value); setShowMoveDropdown(true); }}
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
                          key={m.name}
                          type="button"
                          onMouseDown={() => { setMoveSlug(m.name); setMoveText(""); setShowMoveDropdown(false); }}
                          className="block w-full rounded-md px-2 py-1 text-left text-sm capitalize text-[color:var(--ink)] hover:bg-black/5"
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
                        className={`rounded-full px-3 py-1 text-sm capitalize ${selectedTargets.includes(p.name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isStatusMove && !fieldSetter && !noTargetUI && selectedTargets.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Result per target</p>
                  {selectedTargets.map((t) => (
                    <div key={t} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-20 shrink-0 text-xs capitalize text-[color:var(--ink)]/60">{t}</span>
                      {RESULT_OPTIONS.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setTargetResults((prev) => ({ ...prev, [t]: r.key }))}
                          className={`rounded-full px-2.5 py-1 text-xs ${targetResults[t] === r.key ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {!fieldSetter && (isStatusMove || moveDetail?.ailment) && (
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
                        className={`rounded-full px-2.5 py-1 text-xs ${effectChoice === opt ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}
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
        ) : (
          actor && actorP && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Switched in</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(actorP.side === "yours" ? yourTeamNames : opponentTeamNames)
                  .filter((name) => !participants.some((p) => p.name === name))
                  .map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSwitchTo(name)}
                      className={`rounded-full px-3 py-1 text-sm capitalize ${switchTo === name ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                    >
                      {name}
                    </button>
                  ))}
              </div>
            </div>
          )
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-md bg-black/10 px-3 py-2 text-sm font-medium text-[color:var(--ink)]">Cancel</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={mode === "switch" ? !switchTo : !canConfirmMove}
            className="flex-1 rounded-md bg-[color:var(--shell-accent)] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add event
          </button>
        </div>
      </div>
    </div>
  );
}