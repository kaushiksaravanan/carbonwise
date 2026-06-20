# CarbonWise - AI Carbon Intelligence Agent

> Track, understand, and reduce your carbon footprint with personalized AI insights and a living digital garden.

## Chosen Vertical

**Sustainability & Carbon Footprint Reduction** — A smart, dynamic assistant that helps individuals track, understand, and reduce their carbon footprint through simple actions and personalized insights.

## Live Demo

[Deployed Link](https://carbonwise.vercel.app)

## Approach & Logic

### First-Principles Design

Most carbon tracking apps fail because they're boring calculators with generic advice. We redesigned from first principles:

1. **Problem**: People don't reduce emissions because feedback is abstract and delayed
2. **Insight**: Humans respond to visual metaphors and immediate feedback (like fitness trackers)
3. **Solution**: A living digital garden that thrives when you make low-carbon choices

### Architecture

```
┌─────────────────────────────────────────┐
│           CarbonWise Frontend            │
│  (Next.js 14 + TypeScript + Tailwind)   │
├─────────────────────────────────────────┤
│   Onboarding → Dashboard → AI Coach    │
│   What-If Simulator → Digital Garden    │
├─────────────────────────────────────────┤
│          API Routes (Edge)              │
│   /api/chat  /api/calculate  /api/insights │
├─────────────────────────────────────────┤
│       Gemini AI via CipherStack         │
│  (Automatic LRU key rotation pool)      │
└─────────────────────────────────────────┘
```

### Core Features

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| **Quick Onboarding** | 5-question lifestyle quiz | No 50-field forms; instant Carbon Profile in 30 seconds |
| **Daily Carbon Budget** | Visual ring showing today's CO2 usage vs budget | Makes abstract numbers tangible and real-time |
| **AI Carbon Coach** | Conversational AI trained on your lifestyle | Personalized advice, not generic "drive less" platitudes |
| **What-If Simulator** | "What if I bike to work?" → instant impact | Empowers decision-making with real numbers |
| **Digital Garden** | Living garden that grows/wilts based on choices | Emotional connection turns data into behavior change |
| **Weekly Insights** | AI-generated pattern analysis | Finds what you can't see — hidden emission sources |

### How It Works

1. **Onboard**: Answer 5 lifestyle questions → system calculates your baseline emissions using EPA/DEFRA/IPCC emission factors
2. **Daily Budget**: You get a carbon budget (80% of baseline = realistic 20% reduction target)
3. **Track**: Log activities → see your ring fill up (green/yellow/red states)
4. **AI Coach**: Ask questions, get contextual advice based on YOUR habits
5. **Simulate**: Test scenarios before committing ("What if I go vegetarian on weekdays?")
6. **Garden**: Your garden grows trees (10 flowers = 1 tree) when you stay under budget

### Technical Decisions

- **Gemini via CipherStack**: API keys auto-rotate via LRU pool (8 keys). On 429, the exhausted key enters 60s cooldown and a fresh key is vended automatically. Zero downtime.
- **LocalStorage for data**: Privacy-first design — your data never leaves your device. No database needed.
- **Emission factors from authoritative sources**: EPA (US), DEFRA (UK), IPCC (global) — not made-up numbers.
- **Edge API routes**: Calculations run server-side to prevent client manipulation of carbon numbers.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS with custom carbon/earth color palette
- **Animations**: Lottie (lightweight JSON animations for the garden)
- **AI**: Google Gemini 2.0 Flash via CipherStack key rotation
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel (Edge runtime)
- **Security**: CSP headers, rate limiting, input validation, no exposed secrets

## Running Locally

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/carbonwise.git
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

## Testing

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

Test coverage includes:
- Carbon calculation accuracy (29 unit tests)
- Storage persistence round-trips (12 tests)
- API endpoint validation (12 tests)
- Edge cases: zero-emission activities, unknown activities, extreme values

## Assumptions Made

1. **Target audience**: Environmentally-conscious individuals in India and globally
2. **Average commute**: 15km/day used as baseline for transport calculations
3. **Emission factors**: Based on 2023 EPA/DEFRA data; may vary by region
4. **Budget target**: 20% reduction from current baseline is ambitious but achievable
5. **Privacy model**: All personal data stored client-side only; only chat messages sent to AI
6. **Garden metaphor**: Gamification encourages sustained engagement over time

## Security Measures

- API keys never exposed to client (server-side only via environment variables)
- Rate limiting on AI endpoints (10 req/60s per IP)
- Input sanitization and length limits on all user inputs
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- No cookies or tracking — fully privacy-preserving

## Accessibility

- Semantic HTML with ARIA labels and roles
- Keyboard navigable (focus-visible states on all interactive elements)
- Color contrast meets WCAG 2.1 AA standards
- Screen reader friendly (role="meter", role="radiogroup", aria-current)
- Responsive design (mobile-first, works on all screen sizes)

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
│   │   └── storage.ts          # LocalStorage abstraction
│   ├── types/               # TypeScript interfaces
│   └── __tests__/           # Test suite
├── public/animations/       # Lottie JSON files
└── README.md
```

## License

MIT
