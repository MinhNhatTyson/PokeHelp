import { NextRequest, NextResponse } from "next/server";
import { ComboResult } from "@/lib/logic/battleOptimizer";
import { parseGeminiError } from "@/lib/server/geminiError";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface StrategyRequestBody {
  teamStrategy: string;
  slotNotes: { name: string; roleNotes: string | null }[];
  opponentPreview: { name: string; abilityGuess: string | null }[];
  topCombo: ComboResult; // just the #1 ranked combo — keep the prompt small and focused
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body: StrategyRequestBody = await req.json();

  const prompt = buildPrompt(body);

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      const rateLimitInfo = parseGeminiError(res.status, errorBody);
      if (rateLimitInfo.isRateLimit) {
        console.error("Gemini rate limit hit:", rateLimitInfo);
        return NextResponse.json({ error: "rate_limit", rateLimitInfo }, { status: 429 });
      }
      if (res.status === 503) {
        console.error("Gemini overloaded after retries:", errorBody);
        return NextResponse.json({ error: "overloaded" }, { status: 503 });
      }
      console.error("Gemini request failed:", res.status, errorBody);
      return NextResponse.json({ error: "Gemini request failed", detail: errorBody }, { status: 502 });
    }

    const data = await res.json();
    const narrative = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!narrative) {
      console.error("Empty response from Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Empty response from Gemini", detail: data }, { status: 502 });
    }

    return NextResponse.json({ narrative });
  } catch (err) {
    console.error("Gemini request threw:", err);
    return NextResponse.json({ error: "Gemini request threw" }, { status: 502 });
  }
}

function buildPrompt(body: StrategyRequestBody): string {
  const { teamStrategy, slotNotes, opponentPreview, topCombo } = body;

  return `You are a VGC (Pokémon doubles) strategy assistant. A player has already computed a heuristic-ranked bring-4 recommendation. Your job is ONLY to write grounded, specific strategic narration for it — do not re-rank or contradict the math, just explain and contextualize it using the player's own stated intent.

Player's overall team game plan: ${teamStrategy || "(not provided)"}

Per-mon roles the player stated:
${slotNotes.map((s) => `- ${s.name}: ${s.roleNotes ?? "(no notes given)"}`).join("\n")}

Opponent's team preview: ${opponentPreview.map((o) => `${o.name}${o.abilityGuess ? ` (${o.abilityGuess})` : ""}`).join(", ")}

Your job is ONLY to write grounded, specific strategic narration for it — do not re-rank the combos or invent numbers, but you should flag real risk when the damage-check data shows it, rather than only narrating positively.

Top-ranked combo (already computed, score ${topCombo.breakdown.total.toFixed(1)}): ${topCombo.members.map((m) => m.name).join(", ")}
Suggested lead: ${topCombo.recommendedLead.map((m) => m.name).join(" + ")}
Existing heuristic notes: ${topCombo.strategyNotes.join(" ")}
${topCombo.leadDamageChecks.length > 0
  ? `Computed opening damage checks for the suggested lead (from @smogon/calc — ground truth, do not contradict these numbers):\n${topCombo.leadDamageChecks.map((c) => `- ${c.description}`).join("\n")}`
  : "No opening damage check data available for this lead."}

Write 3-5 sentences of concrete, game-plan-aware strategy narration. Reference the player's stated roles/game plan directly where relevant. Do not invent movesets or abilities not implied by the data given. If the damage-check data above shows the suggested lead facing a 2HKO-or-worse with no clear answer, say so plainly rather than narrating around it — a confident recommendation that hides real risk is worse than one that's honest about it.`;
}