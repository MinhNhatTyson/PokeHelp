import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, geminiFailure } from "@/lib/server/gemini";

interface SummaryRequestBody {
  yourTeam: string[];
  opponentTeam: string[];
  yourLeads: string[];
  opponentLeads: string[];
  outcome: "win" | "loss" | null;
  playerNote: string; // what the player typed themselves in Live Battle, may be empty
  log: string[];      // one compiled sentence per turn
  model?: string;
}

const MAX_TURNS = 30;
const MAX_TURN_CHARS = 400;
const MAX_SUMMARY_CHARS = 300;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  const body = (await req.json()) as SummaryRequestBody;
  if (!Array.isArray(body.log) || body.log.length === 0) {
    return NextResponse.json({ error: "No turn log to summarize" }, { status: 400 });
  }

  const log = body.log.slice(0, MAX_TURNS).map((l) => String(l).slice(0, MAX_TURN_CHARS));
  const result = await callGemini(
    apiKey,
    {
      contents: [{ parts: [{ text: buildPrompt({ ...body, log }) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } },
    },
    body.model
  );
  if (!result.ok) return geminiFailure(result);

  const summary = extractText(result.data).replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim().slice(0, MAX_SUMMARY_CHARS);
  if (!summary) {
    console.error("Empty response from Gemini:", JSON.stringify(result.data));
    return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
  }
  return NextResponse.json({ summary, model: result.model });
}

function buildPrompt(b: SummaryRequestBody & { log: string[] }): string {
  return `Format: Pokémon Champions doubles (VGC), Level 50, Mega Evolution is the only gimmick.
You write the "main reason" line for a player's battle history. Summarize WHY the battle went the way it did in 1-2 short sentences (under ${MAX_SUMMARY_CHARS} characters total), in plain language, naming specific Pokémon and moves.

Strict rules:
- Use ONLY facts stated in the turn log or the player's note below. Never invent moves, damage numbers, abilities, or events.
- If the log doesn't show a clear cause, describe the key turning point you can see instead of guessing.
- ${b.outcome ? `The result was a ${b.outcome.toUpperCase()}; make the reason consistent with that.` : "The result is unknown; do not claim a win or a loss."}
- Output the sentence(s) only: no quotes, no bullet points, no preamble.

Player's bring-4: ${b.yourTeam.join(", ") || "(unknown)"}
Player's leads: ${b.yourLeads.join(" + ") || "(unknown)"}
Opponent's team preview: ${b.opponentTeam.join(", ") || "(unknown)"}
Opponent's leads: ${b.opponentLeads.join(" + ") || "(unknown)"}
Player's own note: ${b.playerNote?.trim() || "(none)"}

Turn log:
${b.log.map((l, i) => `T${i + 1}: ${l}`).join("\n")}`;
}