# LinkedIn Build-in-Public Post

Copy the text below the divider into LinkedIn.

---

72 hours ago, I was staring at a blank Next.js project wondering if I could ship something that actually mattered.

Today, CarbonWise is live.

Here's the thing about climate tech — most apps either guilt-trip you into apathy or drown you in spreadsheets. I wanted to build something that felt alive. Something that responded to you.

So I built an AI Carbon Intelligence Agent for PromptWars Challenge 3.

The core loop:
- A 60-second onboarding quiz that profiles your lifestyle
- A daily carbon budget ring (think Apple Watch, but for the planet)
- An AI Carbon Coach powered by Gemini that chats with you like a knowledgeable friend, not a textbook
- A What-If Simulator: "what happens if I switch to transit twice a week?"
- And my favorite — a Living Digital Garden that literally grows lush when you make sustainable choices and wilts when you don't

Two things I learned the hard way:

1. Gemini rate limits will absolutely humble you mid-demo. I solved this by routing every AI call through CipherStack with LRU key rotation across 8 keys — when one hits a 429, the next vends automatically. Zero downtime, zero hardcoded secrets.

2. The digital garden was almost cut for being "too whimsical." I kept it because data alone doesn't change behavior — emotion does. Watching a Lottie sapling droop hits harder than seeing 4.2 kg of CO2 on a dashboard.

Stack: Next.js 14, TypeScript, Tailwind, Gemini AI, Lottie.

Massive thanks to Google for Developers and Hack2skill for the playground. Building under a deadline forces decisions you'd otherwise debate for weeks.

Try it, break it, tell me what's missing: https://carbonwise-mu.vercel.app
Code's open: https://github.com/kaushiksaravanan/carbonwise

What feature would you want next? Genuinely asking.

#PromptWars #AntigravityAI #BuildInPublic #SustainableTech #Hackathon
