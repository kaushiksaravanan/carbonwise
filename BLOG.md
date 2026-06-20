# Building CarbonWise: How a Digital Garden Beat the Spreadsheet at Climate Behavior Change

*A technical writeup from the PromptWars Hackathon — Challenge 3*

## 1. The Problem: Why Most Carbon Apps Fail

Open any carbon-tracking app and you'll find the same anti-pattern: a dashboard of bar charts, an absolute number measured in tonnes, and a vague suggestion to "fly less." Three weeks later, the user has uninstalled it.

The failure mode is consistent across the category:

- **Abstract units.** "4.7 tonnes CO2e per year" lands somewhere between meaningless and despairing. Nobody has an intuition for tonnes of an invisible gas.
- **No feedback loop.** You log a flight on Monday. Nothing happens until your annual report in December. The behavior signal is too sparse to shape behavior.
- **Generic advice.** "Eat less beef" — to a vegetarian. "Drive less" — to someone who already takes the train. The model has no idea who you are.
- **Guilt-as-UX.** Red numbers, frowny graphs, lecturing copy. The app punishes use, so use stops.

We wanted to build something a person would willingly open every day for a year.

## 2. First-Principles Insight: Behavior Change Needs a Living Object

The literature on habit formation (Fogg, Duhigg, Wood) keeps circling one finding: humans don't change behavior in response to *information*; we change it in response to *visible consequences on something we care about*.

Tamagotchis worked. Streaks work. Plant-watering apps work. Spreadsheets do not.

So the design question stopped being "how do we display carbon data?" and became "what's the smallest living thing whose state we can map onto a carbon budget?"

The answer, for us, was a garden. Plant a tree when you cycle to work. Watch the canopy thin when you order a same-day delivery. The math underneath is the same EPA emission factor that powers the spreadsheet — but the rendering target is something you root for.

## 3. Architecture Overview

CarbonWise is a Next.js 14 App Router application with a thin server layer for AI calls. Everything else runs in the browser against `localStorage`, so the user owns their data and we own no PII.

```
+-----------------------------------------------------------+
|  Browser (Next.js 14 / React / Tailwind / Lottie)         |
|                                                           |
|  +--------------+  +-------------+  +------------------+  |
|  | OnboardingQ  |  | Garden.tsx  |  | WhatIfCard.tsx   |  |
|  +------+-------+  +------+------+  +---------+--------+  |
|         |                 |                   |           |
|         v                 v                   v           |
|  +-----------------------------------------------------+  |
|  |  carbon-calculator.ts   |   storage.ts (localStorage)| |
|  +-----------+--------------------------+--------------+  |
|              |                          |                 |
+--------------|--------------------------|-----------------+
               | /api/chat                | /api/calculate
               v                          v
+--------------+--------------------------+-----------------+
|  Next.js API Routes (server-only)                         |
|  - rate-limit.ts (per-IP token bucket)                    |
|  - gemini.ts  ----> CipherStack vend  ----> Gemini 2.0    |
+-----------------------------------------------------------+
                           |
                           v
                +--------------------+
                |  CipherStack       |
                |  LRU pool: 8 keys  |
                |  60s cooldown      |
                +--------------------+
```

Three principles fell out of this:

1. **No server database.** Lifestyle, entries, and garden state live in `localStorage`. The server is stateless.
2. **Server-only API keys.** The Gemini key never touches the browser. All AI traffic flows through `/api/chat` and `/api/insights`.
3. **The AI sees a digest, not the raw log.** `buildPersonalizationDigest()` summarizes the last 7 days into ~200 tokens before it's prepended to the system prompt.

## 4. The Gemini Proxy Pattern: LRU Key Rotation

The single most useful piece of infrastructure we built was a *proxy in front of Gemini*. Free-tier Gemini gives generous limits per key but rate-limits aggressively under burst load. A demo with five judges hitting the chat panel simultaneously is exactly the load profile that breaks a single-key setup.

The fix is boring and effective: hold a pool of N keys, vend the least-recently-used one on each request, and put any key that returns 429 into a 60-second cooldown so the next vend skips it. We host this as a separate service called CipherStack so other hackathon projects can reuse the pool.

The client side is small enough to fit on one screen:

```typescript
// src/lib/gemini.ts
export async function chatWithGemini(
  messages: GeminiMessage[],
  systemPrompt: string
): Promise<string> {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { key, key_id } = await vendGeminiKey();

    const response = await fetch(
      // API key in header (not URL) so it can't leak via URL echoes / logs.
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    if (response.status === 429) {
      // Key exhausted — report to CipherStack for 60s cooldown, retry with fresh key.
      await reportUsage(key_id, { error: "429_rate_limited" });
      continue;
    }

    if (!response.ok) {
      // Never propagate upstream body — it can echo the key from the URL.
      await reportUsage(key_id, { error: `${response.status}_upstream` });
      if (response.status >= 500) continue;
      throw new Error("Gemini upstream failed");
    }

    const data = await response.json();
    await reportUsage(key_id, {
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  throw new Error("Gemini upstream failed");
}
```

Two non-obvious details earned their keep:

- **Key in header, not URL.** Gemini accepts `?key=` query strings, but those bleed into logs, error bodies, and proxy access logs. `x-goog-api-key` keeps the secret out of URL echoes.
- **Never forward the upstream error body to clients.** Upstream 4xx responses sometimes contain the request URL — which contains the key when `?key=` is used. We log to stderr server-side and return a generic `"Gemini upstream failed"` to the browser.

Net effect: we got 8x the practical rate limit and a single failure-handling path that survived a noisy demo.

## 5. The Digital Garden System

The garden is a deterministic function of two numbers:

- `budgetRemaining` — a 0..1 ratio of *today's* carbon budget left, drives the sky color.
- `rollingHealth` — a 0..1 score over the last 7 days, drives the grass and the plant population.

Each plant has a `stage` of `sprout`, `sapling`, or `canopy`, assigned by *order of planting* — the oldest plants are the most mature:

```typescript
function stageFromIndex(i: number, total: number): Plant['stage'] {
  if (total === 0) return 'sprout';
  const ratio = (total - i) / total;
  if (ratio > 0.66) return 'canopy';
  if (ratio > 0.33) return 'sapling';
  return 'sprout';
}
```

Layout is generated from a `mulberry32` seeded PRNG keyed on the user's lifestyle hash, so the garden looks the same across reloads but different across users.

Why this works psychologically: the canopy is *earned over time*. A bad week thins the foliage but doesn't reset the trees you planted in week one. Loss aversion stops being a punishment and becomes a reason to come back tomorrow.

## 6. The What-If Simulator

The What-If panel lets users type free-form scenarios — "what if I switched to the train for my daily commute?" — and see the projected delta. The math is a per-activity emission factor lookup multiplied by the user's stated quantity:

```
delta_kg = (factor[old_activity] - factor[new_activity]) * quantity * frequency
```

For example: a 15 km daily car commute over a year, swapped to bus:

```
old:  0.21 kg/km * 15 km * 250 days = 787.5 kg/yr
new:  0.089 kg/km * 15 km * 250 days = 333.8 kg/yr
delta:                                 -453.7 kg/yr
```

The Gemini call only does the *parsing* — turning "ditch the car for the bus" into `{from: "drive-car", to: "take-bus", km: 15, days: 250}`. The arithmetic stays deterministic in `carbon-calculator.ts`, which is unit-tested. Letting the model do the math was the first thing we tried, and the first thing we deleted; floating-point hallucinations are a thing.

## 7. Lessons Learned

- **The model is a parser, not a calculator.** Anywhere a number had to be right, we routed through TypeScript and tested it (53 unit tests, mostly here).
- **Personalization is a digest, not a context dump.** Sending the raw entry log to Gemini produced longer prompts and worse advice. A 200-token weekly summary outperformed a 4000-token log.
- **Guilt-free copy is a feature.** We rewrote every error message twice. "You went over budget" became "Tomorrow's a fresh plot."
- **WCAG 2.1 AA is cheap if you start on day one and expensive if you bolt it on.** Tailwind's `focus-visible:` utilities and a single keyboard-trap audit got us most of the way.
- **Server-only secrets, every time.** The browser has no business holding a Gemini key, even briefly.

## 8. What's Next

- **Multi-user gardens** — shared plots for households or office teams, with a leaderboard that ranks by *improvement*, not absolute footprint (the latter just rewards whoever was already low).
- **Receipt OCR** — drop a grocery receipt, get a per-item carbon estimate. The Gemini Vision model already handles the parsing well in spike tests.
- **Native widgets** — an iOS Lock Screen widget showing today's budget remaining is the obvious next surface. The Tamagotchi-on-your-Lock-Screen play.
- **Offline-first sync** — `localStorage` is great for v1; a CRDT-backed sync layer for v2 lets the same garden grow across phone and laptop without us holding user data.

If a tonne of CO2 is too abstract to care about, then the design problem isn't measurement — it's translation. CarbonWise's bet is that a wilting tree is a better unit than a kilogram. Three weeks of demoing it suggests the bet is correct.

---

*Built for PromptWars Hackathon Challenge 3. Source: github.com/yourname/carbonwise.*
