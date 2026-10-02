import { NextResponse } from "next/server";
import { AI_MODELS } from "@/lib/aiModels";
import { parseGeminiError, type GeminiRateLimitInfo } from "@/lib/server/geminiError";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export type GeminiFailure = {
  ok: false;
  error: "rate_limit" | "overloaded" | "failed";
  detail?: string;
  rateLimitInfo?: GeminiRateLimitInfo;
  tried: string[];
};
export type GeminiResult =
  | { ok: true; data: GeminiResponse; model: string; tried: string[] }
  | GeminiFailure;

export function extractText(data: GeminiResponse): string {
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
}

/**
 * requested = a model id  -> only that model (3 attempts, since 503 spikes pass quickly)
 * requested = "auto"/null -> walk AI_MODELS in order, skipping any that are busy,
 *                            out of quota, retired, or reject the request.
 */
export async function callGemini(apiKey: string, requestBody: object, requested?: string | null): Promise<GeminiResult> {
  const ids = AI_MODELS.map((m) => m.id);
  const pick = requested && ids.includes(requested) ? requested : null;
  const chain = pick ? [pick] : ids;
  const attempts = pick ? 3 : 1;

  const tried: string[] = [];
  let last: GeminiFailure = { ok: false, error: "failed", tried };

  for (const model of chain) {
    tried.push(model);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(requestBody),
        });
      } catch (err) {
        last = { ok: false, error: "failed", detail: String(err), tried };
        break;
      }

      if (res.ok) return { ok: true, data: (await res.json()) as GeminiResponse, model, tried };

      const errorBody = await res.text();
      // A bad key won't be fixed by another model
      if (res.status === 401 || res.status === 403) return { ok: false, error: "failed", detail: errorBody, tried };

      const info = parseGeminiError(res.status, errorBody);
      if (info.isRateLimit) {
        last = { ok: false, error: "rate_limit", rateLimitInfo: info, detail: errorBody, tried };
        break; // quota is per model
      }
      if (res.status === 503 || res.status === 500) {
        last = { ok: false, error: "overloaded", detail: errorBody, tried };
        if (attempt < attempts) { await sleep(1200); continue; }
        break;
      }
      last = { ok: false, error: "failed", detail: errorBody, tried };
      break; // 400/404: this model can't serve the request, try the next
    }
  }
  return last;
}

export function geminiFailure(r: GeminiFailure) {
  console.error("Gemini failed:", r.error, "tried:", r.tried.join(", "), r.detail ?? "");
  if (r.error === "rate_limit") {
    return NextResponse.json({ error: "rate_limit", rateLimitInfo: r.rateLimitInfo, tried: r.tried }, { status: 429 });
  }
  if (r.error === "overloaded") return NextResponse.json({ error: "overloaded", tried: r.tried }, { status: 503 });
  return NextResponse.json({ error: "Gemini request failed", detail: r.detail, tried: r.tried }, { status: 502 });
}