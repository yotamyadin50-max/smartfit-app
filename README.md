# Ascend AI

Ascend AI is a fitness and nutrition app scaffold with personalized workout, meal, progress, chat, XP, streak, and achievement screens.

Current status: local-first template. Supabase is not connected. AI requests are routed through the local/serverless `/api/ai` endpoint so the OpenRouter key is never exposed in browser code.

## Getting Started

On this Windows machine you can double-click:

```text
Open Ascend AI.cmd
```

That starts the Vite dev server and opens the app.

Manual run:

```bash
npm install
npm run dev
```

For AI responses, create a local `.env` file and add:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Open:

```text
http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## App Flow

```text
/                 Landing
/signup           Sign up, then onboarding
/login            Sign in
/onboarding       Initial profile setup
/dashboard        Home, XP, streak, workout, next meal
/workout          Live mock workout flow
/workout/summary  Post-workout feedback and XP reward
/nutrition        Mock meal options and mock meal creator
/chat             Mock fitness and nutrition chat
/progress         Mock charts, measurements, achievements, history
/settings         Goal, level, nutrition preference, reminders
```

## Project Structure

```text
src/
  components/      Reusable auth and layout UI
  context/         Mock auth, profile, XP, streak state
  data/            Mock workouts, nutrition, progress, chat data
  hooks/           localStorage hook
  lib/             Mock-only placeholders and storage helpers
  pages/           Route-level screens
```

## Notes

- Authentication is local mock auth stored in `localStorage`.
- User profile, stats, and saved meals are stored locally.
- AI is proxied through `/api/ai`, which reads `OPENROUTER_API_KEY` only on the server side.
- AI model order is fixed server-side: `openai/gpt-4o-mini`, then `meta-llama/llama-3.1-8b-instruct`.
- Supabase files are placeholders only and do not connect to external services.
