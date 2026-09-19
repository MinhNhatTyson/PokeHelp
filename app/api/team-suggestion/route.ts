import { NextRequest, NextResponse } from "next/server";
import { getCommonSet } from "@/lib/data/commonSets";
import { parseGeminiError } from "@/lib/server/geminiError";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

interface TeamMemberContext {
  name: string;
  abilityName: string | null;
  itemName: string | null;
  roleNotes: string | null;
}

interface TeamSuggestionRequestBody {
  members: TeamMemberContext[]; // exactly 5
  teamStrategy: string;
}

interface PokeApiPokemonMinimal {
  name: string;
  abilities: { ability: { name: string }; is_hidden: boolean }[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body: TeamSuggestionRequestBody = await req.json();
  const { members, teamStrategy } = body;

  if (members.length !== 5) {
    return NextResponse.json({ error: "Expected exactly 5 existing team members" }, { status: 400 });
  }

  let parsed: { species?: string; item?: string; ability?: string; reasoning?: string };
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(members, teamStrategy) }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      const rateLimitInfo = parseGeminiError(res.status, errorBody);
      if (rateLimitInfo.isRateLimit) {
        console.error("Gemini rate limit hit:", rateLimitInfo);
        return NextResponse.json({ error: "rate_limit", rateLimitInfo }, { status: 429 });
      }
      console.error("Gemini request failed:", res.status, errorBody);
      return NextResponse.json({ error: "Gemini request failed", detail: errorBody }, { status: 502 });
    }

    const data = await res.json();
    const rawText: string | undefined = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!rawText) {
      console.error("Empty response from Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("Gemini team-suggestion request threw:", err);
    return NextResponse.json({ error: "Gemini request threw" }, { status: 502 });
  }

  if (!parsed.species) {
    return NextResponse.json({ error: "Gemini did not return a species" }, { status: 502 });
  }
  const speciesSlug = parsed.species.trim().toLowerCase().replace(/\s+/g, "-");

  // --- Pass 2: species must be real, and its REAL ability list is what we
  // validate against — same hard-gate philosophy as moveset-suggestion,
  // just two fields (species + ability) instead of one (move). ---
  let pokeData: PokeApiPokemonMinimal;
  try {
    const pokeRes = await fetch(`${POKEAPI_BASE}/pokemon/${speciesSlug}`);
    if (!pokeRes.ok) {
      console.error("Gemini suggested a species PokeAPI doesn't recognize:", speciesSlug);
      return NextResponse.json({ error: "Suggested species failed validation" }, { status: 502 });
    }
    pokeData = await pokeRes.json();
  } catch (err) {
    console.error("PokeAPI species validation threw:", err);
    return NextResponse.json({ error: "Species validation failed" }, { status: 502 });
  }

  const realAbilities = pokeData.abilities.map((a) => a.ability.name);
  const commonSet = getCommonSet(pokeData.name);

  // Ability fallback chain, never invented: Gemini's pick if real for this
  // species -> curated common-set ability if real for it -> the species'
  // own default non-hidden ability from PokeAPI.
  let abilityName: string | null;
  if (parsed.ability && realAbilities.includes(parsed.ability)) {
    abilityName = parsed.ability;
  } else if (commonSet && realAbilities.includes(commonSet.likelyAbility)) {
    abilityName = commonSet.likelyAbility;
  } else {
    abilityName = pokeData.abilities.find((a) => !a.is_hidden)?.ability.name ?? realAbilities[0] ?? null;
  }

  // Item validated loosely (per your call): an unverifiable item drops to
  // null rather than failing the whole suggestion.
  let itemName: string | null = null;
  const itemCandidate = parsed.item?.trim().toLowerCase().replace(/\s+/g, "-") ?? null;
  if (itemCandidate) {
    try {
      const itemRes = await fetch(`${POKEAPI_BASE}/item/${itemCandidate}`);
      if (itemRes.ok) itemName = itemCandidate;
    } catch {
      // fails soft — itemName stays null
    }
  }

  return NextResponse.json({ species: pokeData.name, abilityName, itemName, reasoning: parsed.reasoning ?? "" });
}

function buildPrompt(members: TeamMemberContext[], teamStrategy: string): string {
  return `You are a VGC (Pokémon doubles) team-building assistant. A player has 5 of 6 team slots filled and needs a 6th Pokémon that synergizes with the rest of the team.

Current team:
${members.map((m) => `- ${m.name}${m.abilityName ? ` (ability: ${m.abilityName})` : ""}${m.itemName ? ` (item: ${m.itemName})` : ""}${m.roleNotes ? ` — role: ${m.roleNotes}` : ""}`).join("\n")}

Player's stated overall game plan: ${teamStrategy || "(not provided)"}

Suggest ONE 6th Pokémon that fills a real gap in this team — defensive typing, a missing role (redirection, Trick Room, weather, speed control, etc.), or offensive coverage the other 5 lack. Base the pick on real, current VGC tournament usage, not just any legal Pokémon. Also suggest a commonly-used competitive item and ability for it.

Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"species": "<PokeAPI slug, e.g. \\"kingambit\\">", "item": "<PokeAPI item slug, e.g. \\"life-orb\\", or null if unsure>", "ability": "<PokeAPI ability slug>", "reasoning": "<2-4 sentences on why this complements the current team>"}`;
}