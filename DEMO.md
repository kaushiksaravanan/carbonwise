# 🌱 CarbonWise — Demo Guide

Welcome, evaluator! This guide walks you through CarbonWise in about 5 minutes. Grab a coffee ☕ and let's go.

---

## ⚡ Quick Start (30 seconds to wow)

1. Visit **[https://carbonwise-mu.vercel.app](https://carbonwise-mu.vercel.app)**
2. Click **"Get Started"** on the landing page
3. Answer 5 quick onboarding questions (~30 seconds)
4. Land on your **Dashboard** — meet your carbon budget ring, your garden, and your streak

That's it. You're tracking your carbon footprint with AI superpowers. 🚀

---

## 🎬 Demo Script (5-minute walkthrough)

### Scene 1: Landing Page → Get Started
Notice the calm, plant-forward aesthetic. Click **"Get Started"** — no signup wall, no friction.

### Scene 2: Onboarding (5 questions, ~30 seconds)
Tell CarbonWise about your commute, diet, home energy, travel habits, and shopping. This builds your personalized baseline.

### Scene 3: Dashboard Tour
- 🟢 **Carbon Budget Ring** — your daily CO₂e budget vs. actual
- 🌷 **Your Garden** — a living visualization of your week (more under-budget days = more blooms)
- 🔥 **Streak Counter** — consecutive days under budget

### Scene 4: Log an Activity
Tap **"+ Log Activity"** → pick "Drove 10 miles" → watch the budget ring update **instantly** with real EPA-sourced emission factors.

### Scene 5: Chat with the AI Coach 🤖
Open the Coach tab and try:
- *"What's the biggest impact change I could make?"*
- *"Compare biking vs taking the bus for my commute."*
- *"I'm vegetarian — should I go vegan?"*

Notice how answers reference **your** specific data — not generic advice.

### Scene 6: What-If Simulator
Open the simulator and try: **"I bike to work 3 days/week."** See the projected annual CO₂e savings, cost savings, and budget impact in real time.

### Scene 7: Watch the Garden Grow 🌻
Come back tomorrow (or use the time-skip dev toggle) — your garden evolves based on your habits. Consistency = bloom.

---

## ✨ Key Features to Highlight

- **🎯 Personalization** — the AI Coach uses YOUR lifestyle data, not generic tips
- **📊 Real Emission Factors** — sourced from EPA, DEFRA, and IPCC datasets
- **🔄 Live AI Rotation** — auto-failover across providers via CipherStack
- **🔒 Privacy-First** — your data stays on your device; no account required

---

## 🛠️ Behind the Scenes

- **Frontend**: Next.js + Tailwind, deployed on Vercel
- **AI Layer**: Multi-provider LLM with CipherStack key rotation (Gemini, Groq, Cerebras)
- **Data**: Local-first storage; emission factor library bundled client-side
- **What's different?** Most carbon trackers guilt-trip you with charts. CarbonWise turns your week into a living garden and pairs it with an AI coach that actually knows your life.

---

## 🧪 Try These Edge Cases

- **Log nothing today?** 🥀 Your garden wilts gradually — gentle nudge, no shame
- **Under budget?** 🌸 Garden grows, flowers bloom, streak climbs
- **Hit the AI rate limit?** 🔁 CipherStack transparently rotates to a fresh key — you won't even notice

---

Enjoy the walkthrough! Questions? Open an issue or chat with the in-app coach. 🌍💚
