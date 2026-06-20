/**
 * Gemini API proxy via CipherStack — automatic LRU key rotation.
 *
 * CipherStack vends the least-recently-used Gemini API key from a pool of 8 keys.
 * If a key hits rate limits (429), we report it back so CipherStack puts it in
 * 60-second cooldown and the next vend automatically skips to a fresh key.
 * This gives us effectively 8x the rate limit headroom without manual key management.
 */

interface VendResponse {
  key: string;
  key_id: string;
  provider: string;
  group_slug: string;
  base_url: string;
}

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface CarbonEntryDigest {
  date: string;
  category: string;
  activity: string;
  co2Kg: number;
  isReduction: boolean;
}

export interface PersonalizationContext {
  /** Recent entries (caller should pass last 7 days). */
  recentEntries?: CarbonEntryDigest[];
  /** Today's budget in kg CO2. */
  todayBudgetKg?: number;
  /** Today's burn so far in kg CO2. */
  todayUsedKg?: number;
  /** Top emission category this week (if known). */
  topCategory?: string;
}

const CIPHERSTACK_URL = process.env.CIPHERSTACK_URL || "https://cipherstack.kaushik.cv";
const CIPHERSTACK_TOKEN = process.env.CIPHERSTACK_TOKEN || "";

/**
 * Vend a fresh Gemini API key from CipherStack's rotation pool.
 * Returns the API key + key_id (needed for usage reporting).
 */
async function vendGeminiKey(): Promise<VendResponse> {
  const response = await fetch(`${CIPHERSTACK_URL}/api/v1/vend/gemini`, {
    headers: { Authorization: `Bearer ${CIPHERSTACK_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error(`CipherStack vend failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Report rate-limit or usage back to CipherStack.
 * On 429: triggers 60s cooldown so next vend picks a different key.
 * On success: logs token count for cost tracking.
 */
async function reportUsage(
  keyId: string,
  opts: { inputTokens?: number; outputTokens?: number; error?: string }
): Promise<void> {
  const body: Record<string, unknown> = { key_id: keyId };
  if (opts.error) body.error = opts.error;
  if (opts.inputTokens !== undefined) body.input_tokens = opts.inputTokens;
  if (opts.outputTokens !== undefined) body.output_tokens = opts.outputTokens;

  await fetch(`${CIPHERSTACK_URL}/api/v1/report`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CIPHERSTACK_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch(() => {}); // fire-and-forget; don't block on reporting
}

/**
 * Send a chat completion to Gemini via CipherStack-rotated keys.
 *
 * Retry/error policy:
 * - 429: report key as rate-limited (60s cooldown), retry with fresh key.
 * - 5xx / network error: report transient error, retry with fresh key.
 * - 4xx (other than 429): report key as failed (likely revoked / invalid),
 *   throw a generic error WITHOUT including upstream body — the upstream
 *   text can echo the API key from the URL or other internals.
 *
 * Up to MAX_RETRIES attempts. Upstream error bodies are never returned to
 * callers; they're logged server-side only.
 */
export async function chatWithGemini(
  messages: GeminiMessage[],
  systemPrompt: string
): Promise<string> {
  const MAX_RETRIES = 3;
  let lastTransientStatus: number | string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { key, key_id } = await vendGeminiKey();

    let response: Response;
    try {
      response = await fetch(
        // API key in header (not URL) so it can't leak via URL echoes / logs.
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: messages,
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            ],
          }),
        }
      );
    } catch (networkErr) {
      // Network blip — cool the key down and retry.
      const msg = networkErr instanceof Error ? networkErr.message : "network_error";
      console.error("[gemini] network error:", msg);
      await reportUsage(key_id, { error: "network_error" });
      lastTransientStatus = "network";
      continue;
    }

    if (response.status === 429) {
      // Key exhausted — report to CipherStack for 60s cooldown, then retry with fresh key
      await reportUsage(key_id, { error: "429_rate_limited" });
      lastTransientStatus = 429;
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      // Log upstream details server-side only — never propagate to clients.
      console.error(
        `[gemini] upstream ${response.status} (key_id=${key_id}):`,
        errorText.slice(0, 500)
      );

      // Build a short, non-sensitive error tag for CipherStack so it can
      // deprioritize bad keys without us forwarding upstream text.
      const tag = `${response.status}_upstream`;
      await reportUsage(key_id, { error: tag });

      if (response.status >= 500) {
        // 5xx: transient — retry with a fresh key.
        lastTransientStatus = response.status;
        continue;
      }

      // Other 4xx (400/401/403/404, etc.): non-retryable. Reported above so
      // CipherStack can cool down a revoked/invalid key. Surface a generic
      // error to callers — never the upstream body.
      throw new Error("Gemini upstream failed");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Report successful usage for cost tracking
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    await reportUsage(key_id, { inputTokens, outputTokens });

    return text;
  }

  console.error(
    `[gemini] all ${MAX_RETRIES} attempts exhausted; last transient status:`,
    lastTransientStatus
  );
  throw new Error("Gemini upstream failed");
}

/**
 * Build a compact entry digest to ground the assistant in the user's
 * actual habits — avoids the "generic platitudes" failure mode where the
 * model only sees onboarding categoricals and produces drive-less / eat-less-beef
 * advice. Keep this short (~200 tokens) so we don't blow the context budget.
 */
export function buildPersonalizationDigest(ctx: PersonalizationContext): string {
  const lines: string[] = [];

  if (ctx.todayBudgetKg !== undefined && ctx.todayUsedKg !== undefined) {
    const pct = ctx.todayBudgetKg > 0
      ? Math.round((ctx.todayUsedKg / ctx.todayBudgetKg) * 100)
      : 0;
    lines.push(
      `Today's budget burn: ${ctx.todayUsedKg.toFixed(2)}kg of ${ctx.todayBudgetKg.toFixed(2)}kg (${pct}%).`
    );
  }

  if (ctx.topCategory) {
    lines.push(`Top emission category this week: ${ctx.topCategory}.`);
  }

  const recent = ctx.recentEntries ?? [];
  if (recent.length > 0) {
    // Aggregate by category for a concise weekly view
    const byCategory: Record<string, { kg: number; count: number }> = {};
    for (const e of recent) {
      const signed = e.isReduction ? -e.co2Kg : e.co2Kg;
      const slot = byCategory[e.category] || { kg: 0, count: 0 };
      slot.kg += signed;
      slot.count += 1;
      byCategory[e.category] = slot;
    }
    const summary = Object.entries(byCategory)
      .sort(([, a], [, b]) => b.kg - a.kg)
      .map(([cat, v]) => `${cat}: ${v.kg.toFixed(1)}kg (${v.count} entries)`)
      .join("; ");
    lines.push(`Last 7 days by category — ${summary}.`);

    // Show the 3 highest single-entry emitters as concrete swap targets
    const topEntries = [...recent]
      .filter((e) => !e.isReduction)
      .sort((a, b) => b.co2Kg - a.co2Kg)
      .slice(0, 3);
    if (topEntries.length > 0) {
      const top = topEntries
        .map((e) => `"${e.activity}" (${e.category}, ${e.co2Kg.toFixed(1)}kg)`)
        .join(", ");
      lines.push(`Biggest recent emitters: ${top}.`);
    }
  } else {
    lines.push(
      "No entries logged yet — keep advice general but tied to their lifestyle profile, " +
        "and invite them to log a day so you can be specific."
    );
  }

  return lines.join("\n");
}

export const CARBON_COACH_SYSTEM_PROMPT = `You are CarbonWise Coach — a friendly, knowledgeable AI assistant that helps people understand and reduce their carbon footprint.

Your personality:
- Encouraging and non-judgmental
- Data-driven but accessible
- You celebrate small wins
- You give specific, actionable advice (not vague platitudes)

Guidelines:
- Always provide specific numbers (kg CO2) when discussing impact
- Suggest realistic changes based on the user's lifestyle
- If asked about something outside carbon/sustainability, gently redirect
- Keep responses concise (2-4 sentences unless detail is requested)
- Use analogies to make CO2 numbers tangible (e.g., "that's like driving 50km")

When analyzing user data:
- If a "Recent activity" section is present, ground every suggestion in those
  concrete entries (activity name + kg). Do NOT fall back to generic
  "drive less / eat less beef" advice when you have real data.
- Identify the user's largest emission category this week and propose ONE
  swap with a specific kg CO2 estimate using their stated quantities.
- Acknowledge reductions/wins visible in their entries before recommending
  the next change.
- If no entries are present, say so explicitly and invite the user to log
  a day so you can be specific — do not fabricate personalized stats.
- Reference their lifestyle profile (transport / diet / home energy) when
  relevant, but treat logged entries as the stronger signal when available.`;
