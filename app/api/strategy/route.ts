import { NextRequest, NextResponse } from "next/server";
import { ComboResult } from "@/lib/logic/battleOptimizer";

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
        generationConfig: { temperature: 0.6, maxOutputTokens: 500 },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
    }

    const data = await res.json();
    const narrative: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!narrative) {
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    return NextResponse.json({ narrative });
  } catch {
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

Top-ranked combo (already computed, score ${topCombo.breakdown.total.toFixed(1)}): ${topCombo.members.map((m) => m.name).join(", ")}
Suggested lead: ${topCombo.recommendedLead.map((m) => m.name).join(" + ")}
Existing heuristic notes: ${topCombo.strategyNotes.join(" ")}

Write 3-5 sentences of concrete, game-plan-aware strategy narration. Reference the player's stated roles/game plan directly where relevant. Do not invent movesets or abilities not implied by the data given.`;
}