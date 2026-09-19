export interface GeminiRateLimitInfo {
  isRateLimit: boolean;
  limitType: "requests-per-minute" | "tokens-per-minute" | "requests-per-day" | "unknown";
  quotaId: string | null;
  retryAfterSeconds: number | null;
}

export function parseGeminiError(status: number, body: string): GeminiRateLimitInfo {
  if (status !== 429) {
    return { isRateLimit: false, limitType: "unknown", quotaId: null, retryAfterSeconds: null };
  }

  let parsed: { error?: { details?: Record<string, unknown>[] } };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { isRateLimit: true, limitType: "unknown", quotaId: null, retryAfterSeconds: null };
  }

  const details = parsed.error?.details ?? [];
  const quotaFailure = details.find((d) => String(d["@type"]).includes("QuotaFailure"));
  const violation = (quotaFailure?.violations as { quotaId?: string; quotaMetric?: string }[] | undefined)?.[0];
  const quotaId = violation?.quotaId ?? null;
  const haystack = `${violation?.quotaId ?? ""} ${violation?.quotaMetric ?? ""}`.toLowerCase();

  const retryInfo = details.find((d) => String(d["@type"]).includes("RetryInfo"));
  const retryDelay = (retryInfo?.retryDelay as string | undefined);
  const retryAfterSeconds = retryDelay ? parseInt(retryDelay, 10) || null : null;

  const limitType = haystack.includes("perday")
    ? "requests-per-day"
    : haystack.includes("token")
    ? "tokens-per-minute"
    : haystack.includes("perminute")
    ? "requests-per-minute"
    : "unknown";

  return { isRateLimit: true, limitType, quotaId, retryAfterSeconds };
}