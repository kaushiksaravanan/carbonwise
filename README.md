# CarbonWise

CarbonWise is a hackathon prototype for tracking estimated personal carbon emissions. A lifestyle quiz creates an initial budget. Users can log activities, compare scenarios, and view a garden that changes with their progress. An optional Gemini coach uses their profile and recent activity for context.

[Hosted demo](https://carbonwise-mu.vercel.app) ? the hosted version may differ from this repository.

## What is implemented

- Onboarding and a daily emissions dashboard.
- Activity logging and persistence in browser local storage.
- A what-if simulator and a digital garden.
- API handlers for calculations, chat, scenario parsing, and weekly insights.
- Automated tests for calculations, storage, request validation, and upstream error handling.

The app uses Next.js 15, React 18, TypeScript, Tailwind CSS, and Vitest. It is a portfolio prototype. Emission factors are estimates, and this repository does not establish verified reductions, user outcomes, accessibility conformance, or production performance benchmarks.

## Run locally

Use Node.js 22.13 or newer and npm.

```bash
git clone https://github.com/kaushiksaravanan/carbonwise.git
cd carbonwise
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The local calculation and storage code can be explored without AI credentials. Chat, AI scenario parsing, and AI insights require a working CipherStack service and a valid `CIPHERSTACK_TOKEN`. Configure the service URL with `CIPHERSTACK_URL`; the example points to the author's service and does not grant access to it.

The server requests a Gemini key from CipherStack and calls Google. The current implementation uses `gemini-2.0-flash`; provider availability is not verified by the local tests. Live provider calls can incur charges.

## Verify

```bash
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
npm audit
```

The October 2026 maintenance check passed 86 tests, type checking, and a production build. Lint has one existing hook-dependency warning and no errors. The tests mock external services; they do not verify a live AI service or a deployed user journey.

## Code map and trade-offs

- `src/lib/carbon-calculator.ts`: emission estimates and reduction suggestions.
- `src/lib/storage.ts`: browser storage for profiles and activities.
- `src/lib/gemini.ts`: provider calls, key vending, retries, and personalization prompts.
- `src/app/api/`: request validation and response handlers.
- `src/app/` and `src/components/`: application pages and UI.

Local storage avoids an account system and database, but users must manage their own browser data. Clearing storage removes the saved profile and history. AI endpoints have in-memory rate limiting; that state is not shared across server instances.

## Data and privacy

Profiles and activity history are stored in the browser. AI features send relevant profile details, messages, or activity summaries to the app's server and Google. The data is therefore not confined to the device. CipherStack receives key-vending and usage-report requests. Server credentials belong in environment variables and must not be added to the repository.

Carbon estimates are for exploration and depend on the assumptions in the calculator. AI advice can be inaccurate. Review the calculation inputs and source comments before treating an estimate as evidence.

## Deployment

`vercel.json` disables automatic Git deployments. Pushing portfolio maintenance changes therefore does not update the hosted demo. To release a tested revision, deploy it manually in Vercel. To restore automatic deployment, change `git.deploymentEnabled` after reviewing the project's environment variables and intended production branch.

## License

MIT ? see [LICENSE](LICENSE).

Built for the PromptWars Hackathon.
