"use client";

import { useState } from "react";
import { AI_MODELS, AUTO_MODEL } from "@/lib/aiModels";
import { useAiSettingsStore } from "@/lib/store/aiSettingsStore";

const OPTIONS = [
  { id: AUTO_MODEL, label: "Auto (recommended)", note: "Tries the models below in order and skips any that are busy, out of quota or retired" },
  ...AI_MODELS,
];

export default function AiSettingsPanel() {
  const model = useAiSettingsStore((s) => s.model);
  const setModel = useAiSettingsStore((s) => s.setModel);
  const [test, setTest] = useState<{ status: "idle" | "loading" | "ok" | "fail"; text: string }>({ status: "idle", text: "" });

  async function runTest() {
    setTest({ status: "loading", text: "" });
    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const data = await res.json();
      if (res.ok) {
        const skipped = data.tried.length - 1;
        setTest({ status: "ok", text: `Answered by ${data.model}${skipped > 0 ? ` (skipped ${skipped} unavailable)` : ""}` });
      } else {
        const reason =
          data.error === "overloaded" ? "Busy right now (503)"
          : data.error === "rate_limit" ? "Quota or rate limit hit (429)"
          : `Failed: ${data.error}`;
        setTest({ status: "fail", text: `${reason}${data.tried ? ` — tried ${data.tried.join(", ")}` : ""}` });
      }
    } catch {
      setTest({ status: "fail", text: "Couldn't reach the server." });
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-logo text-2xl sm:text-3xl text-[color:var(--ink)]">Settings</h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">
          Choose which Gemini model powers strategy, move and team suggestions. A specific pick uses only that model
          (with a few retries); Auto falls back across all of them.
        </p>

        <div role="radiogroup" aria-label="AI model" className="mt-5 space-y-2">
          {OPTIONS.map((o) => {
            const active = model === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setModel(o.id)}
                className={`btn-tactile flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left ${
                  active ? "border-[color:var(--shell-accent)] bg-white" : "border-black/10 bg-black/5"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-[color:var(--shell-accent)]" : "border-black/30"}`}>
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--shell-accent)]" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[color:var(--ink)]">{o.label}</span>
                  {o.note && <span className="block text-xs text-[color:var(--ink)]/60">{o.note}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runTest}
            disabled={test.status === "loading"}
            className="btn-tactile btn-glow-accent min-h-[44px] rounded-lg bg-[color:var(--shell-accent)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {test.status === "loading" ? "Testing…" : "Test selected model"}
          </button>
          {test.status === "ok" && <p className="text-sm font-medium text-emerald-800">{test.text}</p>}
          {test.status === "fail" && <p className="text-sm font-medium text-red-700">{test.text}</p>}
        </div>
      </div>
    </div>
  );
}