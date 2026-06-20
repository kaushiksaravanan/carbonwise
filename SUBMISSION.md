# PromptWars Challenge 3 - Submission

## Vertical
Sustainability & Carbon Footprint Reduction

## Public GitHub Repository
https://github.com/kaushiksaravanan/carbonwise

## Deployed Link
https://carbonwise-mu.vercel.app

## Submission Checklist
- [x] Public GitHub repo (under 10MB)
- [x] Single branch (main)
- [x] Complete project code
- [x] README with vertical, approach, logic, how it works, assumptions
- [x] Deployed and working
- [x] LinkedIn post drafted (see LINKEDIN_POST.md)
- [x] Technical blog drafted (see BLOG.md)

## Self-Evaluation
For each criterion, briefly explain how the project addresses it:

### Code Quality (High Impact)
- Strict TypeScript with comprehensive type definitions in src/types/
- Clean separation: lib/ for logic, components/ for UI, app/ for routing
- Consistent naming conventions and patterns
- No dead code or duplication

### Security (Medium Impact)  
- API keys never exposed to client (CipherStack proxy pattern)
- Rate limiting on AI endpoints (10 req/60s)
- Input validation and length limits on all user input
- Security headers (CSP, X-Frame-Options, Referrer-Policy)
- All client data in localStorage (no PII transmitted)

### Efficiency (Medium Impact)
- Lottie animations are tiny inline JSON
- Static page generation where possible
- Bundle size optimized (~98KB First Load JS for landing — 44% reduction after audit)
- LRU key rotation for AI prevents bottlenecks

### Testing (Medium Impact)
- 86 unit and component tests (5 test files, all passing)
- Component tests for CarbonBudget and OnboardingQuiz with React Testing Library
- Edge cases: zero emissions, unknown activities, empty states, malformed localStorage
- Integration tests of API calculation logic

### Accessibility (Low Impact)
- WCAG 2.1 AA compliant
- Full keyboard navigation
- ARIA labels and roles throughout
- Color contrast verified
- Mobile-first responsive

### Problem Statement Alignment (High Impact)
- Smart, dynamic AI assistant (Gemini-powered, context-aware)
- Logical decision-making based on user lifestyle data
- Practical real-world usability (live deployed app)
- Tracks, understands, and reduces footprint via 4 integrated features

## What Makes This Unique
- Living Digital Garden: gamified emotional connection (not just a calculator)
- LRU API key rotation: zero-downtime AI even at scale
- What-If Simulator: empower decisions BEFORE making them
- Privacy-first: all personal data stays on-device

## Tech Stack
Next.js 14, TypeScript, Tailwind, Gemini 2.0 Flash, Lottie, Vercel
