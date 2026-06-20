# Contributing to CarbonWise

Thanks for your interest in CarbonWise! This is an AI-powered personal carbon coach that helps people understand and reduce their daily climate impact through gentle, data-driven nudges. We welcome contributions of all sizes — bug reports, docs fixes, new scenarios, accessibility improvements, and ideas.

## Code of Conduct

Be kind, be patient, assume good intent. Harassment, discrimination, or hostile behavior of any kind will not be tolerated. Disagreements are fine; disrespect is not.

## Local Development

```bash
git clone https://github.com/kaushiksaravanan/carbonwise.git
cd carbonwise
npm install
cp .env.example .env.local   # add your Gemini key or CipherStack token
npm run dev
```

The app runs at `http://localhost:3000`.

## Project Structure

See the [README](./README.md) for a full architecture overview, including the App Router layout, API routes, and the calculator/storage modules.

## Running Tests

```bash
npm test           # run the full unit test suite (53 tests)
npm run test:watch # watch mode while developing
```

## Coding Standards

- **TypeScript strict mode** — no `any`, no implicit `any`, no `// @ts-ignore` without a comment explaining why.
- **Semantic commit messages** — `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- **Small, focused PRs** — one concern per PR. Easier to review, easier to merge.
- Run `npm run lint` and `npm test` before pushing.

## Filing Issues

Use the GitHub issue templates:
- **Bug report** — include reproduction steps, expected vs. actual behavior, browser/OS.
- **Feature request** — describe the user problem first, then the proposed solution.

## Opening a Pull Request

1. Fork the repo and create a branch (`git checkout -b feat/your-feature`).
2. Write your change with tests and updated docs.
3. Push to your fork and open a PR against `main`.
4. Fill out the PR template and link any related issues.

> **Note:** CarbonWise is a hackathon project (PromptWars Challenge 3). Reviews may be slower than typical OSS projects, and not all PRs will be merged immediately — but every contribution is appreciated.

## License

CarbonWise is released under the [MIT License](./LICENSE). By contributing, you agree your work will be licensed under the same terms.
