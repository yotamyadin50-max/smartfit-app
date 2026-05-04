# SmartFit — AI Fitness App

Smart Fit is an AI-powered fitness and nutrition app with personalized workouts, meal planning, progress tracking, and smart coaching.

> **Current status:** Template / scaffold — all screens are built with mock data. Supabase and AI APIs are not yet connected.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
http://localhost:5173
```

### Build for production
```bash
npm run build
npm run preview
```

---

## App Flow

```
/ (Landing)
  ├── /signup → /onboarding → /dashboard
  └── /login  → /dashboard (if onboarding done)

/dashboard   — Home with today's workout, streak, XP, next meal
/workout     — Live workout with countdown, sets, rest timer
/workout/summary — Post-workout feedback + XP reward
/nutrition   — Breakfast / Lunch / Dinner + meal creator
/chat        — AI chat (demo responses)
/progress    — Charts, measurements, achievements, history
/settings    — Goal, level, nutrition pref, reminders
```

---

## Project Structure

```
src/
├── lib/
│   ├── supabase.ts        ← Supabase client (connect via .env.local)
│   └── ai.ts              ← AI API placeholder (connect when ready)
├── context/
│   ├── AuthContext.tsx    ← Auth state (mock + Supabase-ready)
│   └── UserContext.tsx    ← User profile, XP, streak (localStorage)
├── data/
│   ├── mockWorkouts.ts    ← Workout + exercise data
│   ├── mockNutrition.ts   ← Meal options with macros
│   ├── mockProgress.ts    ← History, achievements, measurements
│   └── mockChat.ts        ← Demo chat responses
├── hooks/
│   └── useLocalStorage.ts ← Typed localStorage hook
├── components/
│   ├── auth/              ← LoginForm, SignupForm
│   └── layout/
│       └── BottomNav.tsx  ← App navigation bar
└── pages/
    ├── LandingPage.tsx
    ├── LoginPage.tsx
    ├── SignupPage.tsx
    ├── OnboardingPage.tsx
    ├── DashboardPage.tsx
    ├── WorkoutPage.tsx
    ├── WorkoutSummaryPage.tsx
    ├── NutritionPage.tsx
    ├── ChatPage.tsx
    ├── ProgressPage.tsx
    └── SettingsPage.tsx
```

---

## Connecting Supabase (future)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env.local`
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. The app will automatically switch from mock auth to real Supabase auth

**Tables to create:**
- `user_profiles` — goal, fitnessLevel, workoutType, nutritionPref
- `user_stats` — xp, level, streak, totalWorkouts
- `workout_history` — date, workoutId, feedback, xpEarned
- `body_measurements` — weight, bodyFat, chest, waist, hips
- `saved_meals` — userId, mealId

---

## Connecting AI API (future)

Edit `src/lib/ai.ts` — replace the placeholder functions with real API calls:

| Function | Purpose |
|---|---|
| `sendChatMessage()` | Power the AI chat screen |
| `generateWorkoutPlan()` | Create personalized workouts |
| `generateMealFromIngredients()` | Build meals from user ingredients |
| `generateProgressInsight()` | Weekly/monthly AI insights |

Set `VITE_AI_API_KEY` in `.env.local` when ready.

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (dev server + bundler)
- **React Router v6** (client-side routing)
- **@supabase/supabase-js** (ready, not connected)
- Plain CSS with CSS variables (no UI library)
