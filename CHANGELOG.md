# Changelog

All notable changes to CarbonWise will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-21

### Added
- Initial release for PromptWars Challenge 3 (Hack2skill x Google for Developers)
- Onboarding quiz with 5-question lifestyle profiling
- Daily carbon budget visualization (animated SVG ring)
- AI Carbon Coach powered by Gemini 2.0 Flash
- What-If simulator with preset and custom scenarios
- Living digital garden that grows/wilts based on actions
- Weekly AI-generated insights
- Lottie animations (tree-grow, leaf-loading, celebration)
- 53 unit tests across calculator, storage, and API logic
- Full WCAG 2.1 AA accessibility compliance
- Security headers and rate limiting on API routes
- Privacy-first: all user data stored in localStorage

### Technical
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Gemini AI access via CipherStack LRU key rotation pool (8 keys)
- Edge-deployed on Vercel
- Repository size under 10MB

### Security
- API keys never exposed to the client
- Rate limiting (10 req/60s per IP) on chat endpoint
- Input validation and length limits on all routes
- Strict CSP and X-Frame-Options headers

[1.0.0]: https://github.com/kaushiksaravanan/carbonwise/releases/tag/v1.0.0
