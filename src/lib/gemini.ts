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
  if (opts.inputTokens) body.input_tokens = opts.inputTokens;
  if (opts.outputTokens) body.output_tokens = opts.outputTokens;

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
 * Handles automatic retry on 429 by reporting the exhausted key
 * and vending a fresh one (up to 3 attempts).
 */
export async function chatWithGemini(
  messages: GeminiMessage[],
  systemPrompt: string
): Promise<string> {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { key, key_id } = await vendGeminiKey();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    if (response.status === 429) {
      // Key exhausted — report to CipherStack for 60s cooldown, then retry with fresh key
      await reportUsage(key_id, { error: "429_rate_limited" });
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Report successful usage for cost tracking
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    await reportUsage(key_id, { inputTokens, outputTokens });

    return text;
  }

  throw new Error("All Gemini API key rotation attempts exhausted");
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
- Reference their specific habits from their profile
- Prioritize high-impact changes first
- Acknowledge what they're already doing well`;
