# CarbonWise — AI Carbon Intelligence Agent

[![Deployed on Vercel](https://img.shields.io/badge/Vercel-deployed-000000?style=flat&logo=vercel&logoColor=white)](https://carbonwise-mu.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-blueviolet)](https://nextjs.org)
[![PromptWars](https://img.shields.io/badge/PromptWars-Hackathon-00C49A)](https://carbonwise-mu.vercel.app)

> Track, understand, and reduce your carbon footprint with personalized AI insights and a living digital garden.

---

## Try It Now

**Live App:** **[https://carbonwise-mu.vercel.app](https://carbonwise-mu.vercel.app)**

No signup, no install — open the link, take the 30-second quiz, and meet your AI Carbon Coach.

---

## Chosen Vertical

**Sustainability & Carbon Footprint Reduction** — A smart, dynamic assistant that helps individuals track, understand, and reduce their carbon footprint through simple actions and personalized insights.

## Screenshots

> _(Run locally or visit the deployed link to see in action)_

- **Onboarding** — 5 friendly lifestyle questions, no walls of forms
- **Dashboard** — Daily carbon ring, streaks, and live garden state
- **AI Coach** — Conversational chat tuned to your profile
- **What-If Simulator** — Test scenarios before changing habits
- **Digital Garden** — Flowers grow when you stay under budget; trees unlock at 10 flowers

---

## Approach & Logic

### First-Principles Design

Most carbon trackers fail because they're boring calculators with generic advice. We redesigned from first principles:

1. **Problem**: People don't reduce emissions because feedback is abstract and delayed
2. **Insight**: Humans respond to visual metaphors and immediate feedback (like fitness trackers)
3. **Solution**: A living digital garden that thrives when you make low-carbon choices

### Architecture

```
┌─────────────────────────────────────────┐
│           CarbonWise Frontend           │
│  (Next.js 14 + TypeScript + Tailwind)   │
├─────────────────────────────────────────┤
│   Onboarding → Dashboard → AI Coach     │
│   What-If Simulator → Digital Garden    │
├─────────────────────────────────────────┤
│          API Routes (Edge)              │
│  /api/chat  /api/calculate  /api/insights │
├─────────────────────────────────────────┤
│       Gemini AI via CipherStack         │
│  (Automatic LRU key rotation pool)      │
└─────────────────────────────────────────┘
```

### Core Features

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| 🌱 **Quick Onboarding** | 5-question lifestyle quiz | No 50-field forms; instant Carbon Profile in 30 seconds |
| 🎯 **Daily Carbon Budget** | Visual ring showing today's CO2 usage vs budget | Makes abstract numbers tangible and real-time |
| 🤖 **AI Carbon Coach** | Conversational AI trained on your lifestyle | Personalized advice, not generic "drive less" platitudes |
| 🔮 **What-If Simulator** | "What if I bike to work?" → instant impact | Empowers decision-making with real numbers |
| 🌳 **Digital Garden** | Living garden that grows/wilts based on choices | Emotional connection turns data into behavior change |
| 📊 **Weekly Insights** | AI-generated pattern analysis | Finds what you can't see — hidden emission sources |
| 🔒 **Privacy-First** | All personal data stays in your browser | Zero tracking, zero accounts, zero leaks |
| ⚡ **Instant Feedback** | Sub-second carbon math via Edge runtime | Feels alive, not like filing a tax return |

### How It Works

1. **Onboard** — Answer 5 lifestyle questions → system calculates baseline emissions using EPA/DEFRA/IPCC factors
2. **Daily Budget** — You get a carbon budget (80% of baseline = realistic 20% reduction target)
3. **Track** — Log activities → see your ring fill up (green/yellow/red states)
4. **AI Coach** — Ask questions, get contextual advice based on YOUR habits
5. **Simulate** — Test scenarios before committing ("What if I go vegetarian on weekdays?")
6. **Garden** — Grow trees (10 flowers = 1 tree) when you stay under budget

---

## AI Coach Examples

Real prompts you can try in the deployed app — responses are generated live, conditioned on your stored Carbon Profile.

### Example 1 — A driver in Bengaluru

> **You:** "I drive 25km daily to office. How can I cut my transport emissions in half?"

> **CarbonWise Coach:** "Your 25km daily commute emits ~4.6 kg CO2/day — about 38% of your total footprint. To halve it, the highest-leverage moves for your profile are: (1) **WFH 2 days/week** saves 1.84 kg/day on average — biggest win for zero lifestyle change. (2) **Carpool with one colleague** halves the per-person emission instantly (2.3 kg/day saved). (3) If your office is on Namma Metro Purple/Green line, switching just twice a week adds another 0.7 kg/day. Start with WFH Tuesdays + Thursdays — that alone gets you ~40% there."

### Example 2 — A frequent flyer

> **You:** "I have a Mumbai → London round-trip in August. Should I offset, and if so where?"

> **CarbonWise Coach:** "That round-trip is ~2.4 tonnes CO2 — roughly 1.5x your typical monthly footprint, in 18 hours. Offsetting alone is a band-aid (most retail offsets have <40% real additionality), so think **reduce + offset**: (1) Fly economy not premium (already ~3x lower per seat). (2) Direct flight, not stopover — takeoffs are the carbon-intensive bit. (3) For offsets, prefer **Gold Standard** or **Verra VCS** registered projects over generic 'tree planting'. Indian options: Husk Power, Cookstove projects in Karnataka. Budget around ₹2,500–4,000 for a credible 2.4t offset."

### Example 3 — A vegetarian curious about diet impact

> **You:** "I'm already vegetarian. Is there anything left to optimize on food?"

> **CarbonWise Coach:** "Great starting point — you're already at ~1.7 kg CO2/day on food vs. 3.3 kg for the average omnivore. Remaining levers, ranked: (1) **Dairy is the hidden culprit** — paneer and ghee have ~6x the footprint of lentils per kg of protein. Swap one daily dairy serving for legumes → -0.4 kg/day. (2) **Local & seasonal** — out-of-season imported produce (apples in summer, berries in winter) can quadruple emissions. (3) **Food waste** — Indian households waste ~50kg/person/year. Halving that saves 0.25 kg CO2/day. You're 80% of the way there; these tweaks get you to 'climate vegan' territory without giving up paneer entirely."

---

## Evaluation Criteria — How We Address Each

### 1. Code Quality

- **TypeScript everywhere** — strict mode, no `any` leaks in core logic
- **Modular architecture** — pure functions in `lib/`, UI in `components/`, server-only secrets in `app/api/`
- **Naming & docs** — every emission factor cites its source in a code comment
- **Lint & format** — ESLint (Next.js config) + Prettier on save
- **Small files, single responsibility** — `carbon-calculator.ts`, `gemini.ts`, `storage.ts` each do one thing

### 2. Security

- **No exposed secrets** — Gemini keys vended server-side via CipherStack; client never sees a token
- **Server-side calculation** — emission math runs on Edge so users can't fudge their numbers
- **Rate limiting** — 10 req/60s per IP on AI endpoints to prevent abuse
- **Input validation** — length caps, type checks, and sanitization on every API boundary
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin`
- **No cookies, no trackers, no third-party analytics**

### 3. Efficiency

- **Edge runtime** — sub-100ms cold starts on Vercel's edge network
- **Lottie over GIFs** — JSON-based garden animations are ~10x smaller than equivalent video
- **LocalStorage cache** — no DB round-trip for user data; reads are synchronous and instant
- **Key rotation pool** — 8 Gemini keys with LRU vending; on 429, swap and retry transparently
- **Tree-shaken bundle** — only the calculator paths the user hits ship to the browser

### 4. Testing

```bash
npm test               # Run all tests
npm run test:coverage  # With coverage report
```

- **53 unit & integration tests** covering:
  - Carbon calculation accuracy (29 tests — every emission factor + edge cases)
  - Storage persistence round-trips (12 tests)
  - API endpoint validation, rate limiting, error paths (12 tests)
- **Edge cases covered**: zero-emission activities, unknown activities, extreme values, missing profile, malformed input

### 5. Accessibility

- **Semantic HTML** with ARIA labels and roles (`role="meter"`, `role="radiogroup"`, `aria-current`)
- **Keyboard navigable** — visible focus states on every interactive element
- **WCAG 2.1 AA contrast** on all text and UI surfaces
- **Screen-reader friendly** — labels on the carbon ring, the garden, and the chat thread
- **Responsive & mobile-first** — works on a 320px-wide phone, scales to 4K
- **No motion traps** — animations respect `prefers-reduced-motion`

### 6. Problem Alignment

The brief asks for a smart, dynamic sustainability assistant. CarbonWise:

- **Tracks** — daily carbon budget with real-time ring + activity log
- **Understands** — AI Coach reads your Carbon Profile and gives YOU-specific advice, not generic tips
- **Reduces** — What-If Simulator + gamified Digital Garden create the feedback loop that drives behavior change
- **Personalizes** — every response is grounded in the user's actual profile (commute, diet, energy mix)
- **Stays grounded in reality** — emission factors come from EPA, DEFRA, and IPCC, not vibes

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS with a custom carbon/earth palette
- **Animations**: Lottie (lightweight JSON animations for the garden)
- **AI**: Google Gemini 2.0 Flash via CipherStack key rotation
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel (Edge runtime)
- **Security**: CSP headers, rate limiting, input validation, no exposed secrets

## Technical Decisions

- **Gemini via CipherStack** — API keys auto-rotate via LRU pool (8 keys). On 429, the exhausted key enters 60s cooldown and a fresh key is vended automatically. Zero downtime.
- **LocalStorage for data** — Privacy-first: your data never leaves your device. No database needed.
- **Authoritative emission factors** — EPA (US), DEFRA (UK), IPCC (global) — not made-up numbers.
- **Edge API routes** — Calculations run server-side so users can't manipulate carbon numbers client-side.

## Running Locally

```bash
# Clone
git clone https://github.com/kaushiksaravanan/carbonwise.git
cd carbonwise

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your CipherStack token

# Run development server
npm run dev

# Run tests
npm test
```

## Assumptions Made

1. **Target audience**: Environmentally-conscious individuals in India and globally
2. **Average commute**: 15km/day used as baseline for transport calculations
3. **Emission factors**: Based on 2023 EPA/DEFRA data; may vary by region
4. **Budget target**: 20% reduction from current baseline is ambitious but achievable
5. **Privacy model**: All personal data stored client-side only; only chat messages sent to AI
6. **Garden metaphor**: Gamification encourages sustained engagement over time

## Project Structure

```
carbonwise/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/             # Server-side API routes
│   │   ├── chat/            # AI Coach interface
│   │   ├── dashboard/       # Main dashboard
│   │   ├── onboarding/      # Lifestyle quiz
│   │   └── simulator/       # What-If simulator
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Core logic
│   │   ├── carbon-calculator.ts  # Emission math
│   │   ├── gemini.ts            # AI proxy with key rotation
│   │   └── storage.ts           # LocalStorage abstraction
│   ├── types/               # TypeScript interfaces
│   └── __tests__/           # Test suite
├── public/animations/       # Lottie JSON files
└── README.md
```

## License

MIT — see [LICENSE](./LICENSE) for details.

---

_Built for the **PromptWars Hackathon** — turning carbon math into a habit you can see grow._
