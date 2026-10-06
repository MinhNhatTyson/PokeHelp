"use client";

import { useState } from "react";
import { ComboResult } from "@/lib/logic/battleOptimizer";
import { useBattleHistoryStore } from "@/lib/store/battleHistoryStore";
import { useLiveSessionStore, LiveSessionSnapshot } from "@/lib/store/liveSessionStore";
import { useAiSettingsStore } from "@/lib/store/aiSettingsStore";

const MAX_DRAFT = 500;
const sameTeam = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

function draftFromLog(s: LiveSessionSnapshot): string {
  if (s.reason) return s.reason;
  if (s.log.length === 0) return "";
  const text = `Live Battle, ${s.turnsPlayed} turn${s.turnsPlayed === 1 ? "" : "s"} — ` +
    s.log.map((l, i) => `T${i + 1}: ${l}`).join(" ");
  return text.length > MAX_DRAFT ? `${text.slice(0, MAX_DRAFT)}…` : text;
}

export default function BattleHistoryLogger({
  opponentTeamNames,
  combo,
}: {
  opponentTeamNames: string[];
  combo: ComboResult;
}) {
  const logBattle = useBattleHistoryStore((s) => s.logBattle);
  const snapshot = useLiveSessionStore((s) => s.snapshot);
  const clearSnapshot = useLiveSessionStore((s) => s.clearSnapshot);

  // A Live Battle session against this exact opponent roster
  const match = snapshot && sameTeam(snapshot.opponentTeamNames, opponentTeamNames) ? snapshot : null;
  const [forceForm, setForceForm] = useState(false);
  const prefill = match && !match.logged ? match : null;

  // Manual edits override the pre-filled values (null = "not touched yet")
  const [outcomeEdit, setOutcomeEdit] = useState<"win" | "loss" | null>(null);
  const [reasonEdit, setReasonEdit] = useState<string | null>(null);
  const [leadsEdit, setLeadsEdit] = useState<string[] | null>(null);
  const [logged, setLogged] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const prefillLeads = prefill && prefill.opponentLeads.length === 2 && prefill.opponentLeads.every((n) => opponentTeamNames.includes(n))
    ? prefill.opponentLeads : [];
  const outcome = outcomeEdit ?? prefill?.outcome ?? null;
  const reason = reasonEdit ?? (prefill ? draftFromLog(prefill) : "");
  const oppLeads = leadsEdit ?? prefillLeads;

  const toggleLead = (n: string) =>
    setLeadsEdit(oppLeads.includes(n) ? oppLeads.filter((x) => x !== n) : oppLeads.length < 2 ? [...oppLeads, n] : oppLeads);

  async function handleSummarize() {
    if (!prefill || prefill.log.length === 0) return;
    setAiStatus("loading");
    setAiError(null);
    try {
      const res = await fetch("/api/battle-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourTeam: prefill.yourTeamNames,
          opponentTeam: prefill.opponentTeamNames,
          yourLeads: prefill.yourLeads,
          opponentLeads: oppLeads,
          outcome,
          playerNote: prefill.reason, // only what the player typed; the auto-drafted turn text isn't sent twice
          log: prefill.log,
          model: useAiSettingsStore.getState().model,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiError(
          data.error === "rate_limit"
            ? `Gemini ${data.rateLimitInfo?.limitType ?? "rate"} limit hit${data.rateLimitInfo?.retryAfterSeconds ? ` — retry in ~${data.rateLimitInfo.retryAfterSeconds}s` : ""}.`
            : data.error === "overloaded"
            ? "Every Gemini model is busy right now. Try again in a minute."
            : "Couldn't get a summary. Your draft is unchanged."
        );
        setAiStatus("error");
        return;
      }
      setReasonEdit(data.summary);
      setAiModel(data.model ?? null);
      setAiStatus("idle");
    } catch {
      setAiError("Couldn't reach the server. Your draft is unchanged.");
      setAiStatus("error");
    }
  }

  function handleSubmit() {
    if (!outcome) return;
    const live = prefill && prefill.yourTeamNames.length > 0 ? prefill : null;
    logBattle({
      yourTeamNames: live ? live.yourTeamNames : combo.members.map((m) => m.name),
      opponentTeamNames,
      recommendedLead: live && live.yourLeads.length > 0 ? live.yourLeads : combo.recommendedLead.map((m) => m.name),
      outcome,
      reason: reason.trim(),
      opponentLeads: oppLeads.length === 2 ? oppLeads : undefined,
    });
    if (match) clearSnapshot();
    setLogged(true);
  }

  if (logged) {
    return (
      <div className="mt-4 rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
        Logged — PokeHelp will factor this into future AI strategy for similar matchups.
      </div>
    );
  }

  if (match?.logged && !forceForm) {
    return (
      <div className="mt-4 rounded-lg border border-black/10 bg-white p-4 text-sm text-[color:var(--ink)]">
        <p>
          Your Live Battle against this team was already saved to Battle History
          {match.outcome ? ` (${match.outcome === "win" ? "Win" : "Loss"})` : ""}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setForceForm(true)} className="btn-tactile min-h-[40px] rounded-full bg-black/10 px-4 text-xs font-medium">
            Log another result anyway
          </button>
          <button type="button" onClick={clearSnapshot} className="min-h-[40px] px-2 text-xs text-[color:var(--ink)]/60 hover:underline">
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
      {prefill && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-[color:var(--accent-gold)]/30 px-3 py-2 text-xs text-[color:var(--ink)]">
          <span>
            Filled in from your Live Battle session ({prefill.turnsPlayed} turn{prefill.turnsPlayed === 1 ? "" : "s"}). Edit anything before saving.
          </span>
          <button type="button" onClick={clearSnapshot} className="font-medium underline-offset-2 hover:underline">
            Discard
          </button>
        </div>
      )}
      <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
        How did it go? {prefill ? "(logs your actual bring-4 from Live Battle)" : "(logs against the top-ranked combo above)"}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setOutcomeEdit("win")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${outcome === "win" ? "bg-emerald-600 text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
        >
          Win
        </button>
        <button
          type="button"
          onClick={() => setOutcomeEdit("loss")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${outcome === "loss" ? "bg-red-600 text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
        >
          Loss
        </button>
      </div>
      <p className="mt-3 text-xs font-medium uppercase text-[color:var(--ink)]/40">What did they lead with? (pick 2)</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {opponentTeamNames.map((n) => (
          <button key={n} type="button" onClick={() => toggleLead(n)}
            className={`rounded-full px-3 py-1 text-sm capitalize btn-tactile ${oppLeads.includes(n) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}>
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={reason}
        onChange={(e) => { setReasonEdit(e.target.value); setAiModel(null); }}
        placeholder="Main reason — e.g. Opponent led with Rillaboom + Farigiraf, my Fake Out got redirected, Chi-Yu outsped and OHKO'd my Sylveon before I could act…"
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-black/10 px-3 py-2 text-sm text-[color:var(--ink)] outline-none placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
      />
      {prefill && prefill.log.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={aiStatus === "loading"}
            className="btn-tactile min-h-[40px] rounded-full bg-[color:var(--accent-gold)] px-4 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiStatus === "loading" ? "Summarizing…" : aiModel ? "Summarize again" : "Summarize with AI"}
          </button>
          {aiModel && <span className="text-[11px] text-[color:var(--ink)]/50">Written by {aiModel} — edit freely</span>}
          {aiStatus === "error" && aiError && <span className="text-xs text-red-500">{aiError}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!outcome}
        className="mt-2 rounded-md bg-[color:var(--shell-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save to battle history
      </button>
    </div>
  );
}