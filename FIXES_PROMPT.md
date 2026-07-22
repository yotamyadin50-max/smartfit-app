# SmartFit / FITNESS AI — רשימת בעיות לתיקון

זהו פרומט מקיף לתיקון כל הבעיות הקיימות בקוד. עבור כל בעיה יש תיאור, מיקום בקוד, וההתנהגות הנדרשת.

---

## 🔴 קריטי — Mock Data שמוצג למשתמש כנתונים אמיתיים

### 1. `src/pages/NutritionPage.tsx` — mockMeals
**בעיה:** שורות 301, 318 מייבאות ומציגות `mockMeals` מ-`src/data/mockNutrition.ts` כאילו הן ארוחות של המשתמש.  
**תיקון:** החלף את `mockMeals` בנתוני תפריט שנוצרים לפי פרופיל המשתמש (goal, nutritionPref, age). אפשר להשתמש ב-`generateWeeklyNutritionPlan` שכבר קיים ב-`src/mealPlanEngine.ts` — הוא כבר מייצר ארוחות לפי goal. טאב הארוחות (בוקר/צהריים/ערב) צריך לשלוף מה-plan הזה ולא מ-mock קבוע.

### 2. `src/pages/ProgressPage.tsx` — mockAchievements
**בעיה:** שורה 5 מייבאת `mockAchievements` ושורה 113 ממפה עליהם. ההישגים המוצגים הם hardcoded ולא קשורים לנתוני המשתמש האמיתיים.  
**תיקון:** הסר את `mockAchievements`. השתמש רק ב-`ALL_BADGES` מ-`src/data/badges.ts` עם `b.condition(stats)` — זה כבר קיים ב-`BadgesPage.tsx` ועובד נכון. העתק את הלוגיקה משם.

### 3. `src/pages/ChatPage.tsx` — suggestedQuestions מ-mockChat
**בעיה:** שורה 375 מציגה `suggestedQuestions[language]` מ-`src/data/mockChat.ts`. זו רשימה סטטית שלא מותאמת לפרופיל המשתמש.  
**תיקון:** צור פונקציה `getPersonalizedSuggestions(profile, language)` שמחזירה 4 שאלות מותאמות לפי `profile.goal`, `profile.fitnessLevel`, ו-`profile.nutritionPref`. לדוגמה: אם goal=cut → "מה אני יכול לאכול לפני אימון בחיטוב?". שמור את הרשימה הסטטית כ-fallback.

---

## 🔴 קריטי — חישוב מאקרו שגוי

### 4. `src/pages/NutritionPage.tsx` — createGeneratedMeal
**בעיה:** הפונקציה מחשבת מאקרו עם נוסחה קבועה: `calories: 160 + ingredientCount * 55`. זה לא מדויק — ארוחה עם 5 מצרכים מקבלת 435 קלוריות בלי קשר למה המצרכים.  
**תיקון:** שלח את המצרכים ל-AI (`generateMealFromIngredients` שכבר קיים ב-`src/lib/ai.ts`) וצפה לתשובה עם מאקרו אמיתי. עד שה-AI עונה, הצג skeleton/loading. אם ה-AI נכשל — השתמש ב-fallback עם הנוסחה הקיימת אבל סמן אותה כ"הערכה בלבד".

---

## 🔴 קריטי — AI Prompt פורמט שגוי

### 5. `src/lib/ai.ts` — sendChatMessage
**בעיה:** שורות 12-15 בונות prompt בפורמט `role: content\nrole: content` כטקסט גולמי. זה לא פורמט messages array, מה שגורם ל-AI לקבל הקשר שיחה לא מסודר.  
**תיקון:** שנה את `buildPrompt` ב-`ChatPage.tsx` (שורה 123) כך שישלח ל-`getHybridAiReply` את ה-`messages` array במבנה הנכון, עם system prompt נפרד שמכיל את פרופיל המשתמש, ואת השיחה כ-history. כרגע הכל מגיע כ-string אחד לשדה `prompt`.

---

## 🟠 חשוב — AI Cache לא פג תוקף כראוי

### 6. `src/lib/smartfitData.ts` — AI Cache TTL
**בעיה:** `AI_CACHE_TTL_MS = 1000 * 60 * 12` (12 דקות) מוגדר אבל `getCachedAiReply` לא בודק אם ה-cache פג.  
**תיקון:** ב-`getCachedAiReply` (חפש אותה ב-smartfitData.ts) הוסף בדיקה: `if (Date.now() - new Date(cached.createdAt).getTime() > AI_CACHE_TTL_MS) { removeCachedReply(key); return null; }`. ודא שיש פונקציה `removeCachedReply` שמסירה entry ספציפי מה-cache array.

---

## 🟠 חשוב — קבצי JS ללא TypeScript

### 7. `src/aiTools.js` ו-`src/floatingAiChat.js`
**בעיה:** שני קבצים בשורש `src/` כתובים ב-JS רגיל ללא types. לא ברור מי קורא להם, אין imports שמצביעים עליהם בקוד ה-TSX.  
**תיקון:** 
1. הוסף `declare module '*/aiTools.js'` ו-`declare module '*/floatingAiChat.js'` ב-`src/types/js-modules.d.ts`.
2. בדוק אם מישהו באמת משתמש בהם — אם לא, הוצא אותם ממסלול ה-build (הוסף ל-.gitignore לא, אבל סמן ב-README שהם legacy).
3. אם כן משתמשים — המר ל-.ts עם types מינימליים.

---

## 🟠 חשוב — Social Feed על Mock

### 8. `src/pages/SocialPage.tsx` — mockWorkouts ב-SocialPage
**בעיה:** `SocialPage.tsx` מייבא `mockAerobicWorkouts` ו-`mockWorkouts` מ-`src/data/mockWorkouts.ts` לצורך הצגת אפשרויות לשיתוף. אין בעיה בשימוש בהם כ-template — אבל ה-Feed עצמו טוען מ-`loadWorkoutFeed` שכתוב ב-`src/lib/socialWorkoutService.ts`. ודא שה-Feed מציג רק פוסטים אמיתיים מ-Supabase ולא fallback על mock אם הטעינה נכשלת.  
**תיקון:** ב-`socialWorkoutService.ts` בדוק את `loadWorkoutFeed` — אם הוא מחזיר מערך ריק בשגיאה, הצג "אין פוסטים עדיין" ולא mock data. הוסף error state ברור ב-UI.

---

## 🟠 חשוב — Progress HistoryPage מציג mock workouts

### 9. `src/pages/ProgressPage.tsx` — History Tab
**בעיה:** דף ה-History מציג entries מ-`getProgressData()` שמגיע מ-`progressStorage.ts` (נתונים אמיתיים) — אבל אם אין entries, לא ברור אם מוצג mock או ריק.  
**תיקון:** ודא שה-history tab מציג הודעה "אין היסטוריית אימונים עדיין" כשהמערך ריק, ולא מחליף במשהו מ-mockProgress.

---

## 🟡 בינוני — UX בעיות

### 10. `src/pages/ChatPage.tsx` — אין Slow Loading indicator ראוי
**בעיה:** `SLOW_AI_LOADING_MS = 10000` — אחרי 10 שניות מוצג `slowLoading` state, אבל אין streaming. המשתמש רואה כלום ל-10 שניות, ואז הודעה "לוקח זמן".  
**תיקון:** הוסף animated typing indicator (3 נקודות מתחלפות) שמופיע מיד כשמתחיל loading, לא רק אחרי 10 שניות. ה-`slowLoading` text יופיע בנוסף אחרי 10 שניות כמו שהוא כרגע.

### 11. `src/App.tsx` — RESET_THRESHOLD_MS = 3 דקות
**בעיה:** `DashboardResetGuard` מחזיר את המשתמש ל-dashboard אחרי 3 דקות ברקע. זה יכול לנתק משתמש שעושה אימון ועובר לאפליקציה אחרת לרגע.  
**תיקון:** בדוק אם המשתמש נמצא ב-`/workout` — אם כן, אל תחזיר ל-dashboard. הוסף: `if (window.location.pathname.startsWith('/workout')) return`.

### 12. `src/lib/smartfitData.ts` — MAX_CACHE_ITEMS = 24
**בעיה:** ה-cache מוגבל ל-24 תשובות. כשמגיעים ל-24, הישן ביותר נמחק. אין logging של cache hits/misses.  
**תיקון:** הוסף `console.debug` ל-cache hit/miss (רק בדevelopment: `if (import.meta.env.DEV)`). זה יעזור לדבג ולשפר את ה-cache בעתיד.

---

## 🟡 בינוני — נתיבים וניתוב

### 13. `src/App.tsx` — אין route לשגיאה 404 ברורה
**בעיה:** `<Route path="*" element={<Navigate to="/" replace />}` — כל URL לא קיים מחזיר לדף הבית בשקט. משתמש שנסה לפתוח קישור שבור לא יודע מה קרה.  
**תיקון:** צור קומפוננט `NotFoundPage` פשוט עם הודעה "הדף לא נמצא" וכפתור חזרה, והשתמש בו במקום ה-redirect ל-`/`.

---

## 🟡 בינוני — Supabase Sync

### 14. `src/progressStorage.ts` — fire-and-forget ללא error handling
**בעיה:** שורה 67 בערך — `getCurrentUserId().then(uid => { if (uid) saveProgressEntryToSupabase(...) })` — שגיאות Supabase נבלעות בשקט. המשתמש לא יודע אם ה-sync נכשל.  
**תיקון:** הוסף `.catch(err => console.warn('[Supabase] sync failed', err))` לכל fire-and-forget. בעתיד אפשר לממש retry queue — לעכשיו logging מספיק.

### 15. `src/lib/supabase.ts` — placeholder credentials בproduction
**בעיה:** אם `VITE_SUPABASE_URL` לא מוגדר, ה-client נוצר עם `'https://placeholder.supabase.co'`. כל קריאת API תיכשל בשקט.  
**תיקון:** הוסף בdevelopment: `if (!isSupabaseConfigured && import.meta.env.DEV) { console.error('[Supabase] credentials missing — check .env') }`. בproduction זה לא קריטי כי ה-app עובד offline-first.

---

## 🟡 בינוני — Fitness Tracking

### 16. `src/fitnessTracking.ts` — MET values לא מדויקים לריצה
**בעיה:** `MET_BY_ACTIVITY = { bike: 6.8, run: 8.3, walk: 3.5 }` — ערכי MET ממוצעים קבועים. ריצה ב-8 קמ"ש ≠ ריצה ב-12 קמ"ש מבחינת קלוריות.  
**תיקון:** שנה ל-`getMetForActivity(type, paceKmh)` שמחשב MET דינמי לפי קצב. לריצה: MET ≈ 0.9 * pace_kmh (קירוב סביר). זה ישפר משמעותית את הדיוק של חישוב הקלוריות.

---

## 🟢 נמוך — Code Quality

### 17. `src/lib/ai.ts` — `isAIConfigured = true` hardcoded
**בעיה:** שורה האחרונה: `export const isAIConfigured = true`. זה תמיד true, לא קשור לשום configuration בפועל.  
**תיקון:** `export const isAIConfigured = !!(import.meta.env.VITE_API_BASE_URL || window.location.hostname !== 'localhost')` — או פשוט הסר את ה-export אם לא משתמשים בו.

### 18. `src/pages/WorkoutPage.tsx` — GYM_EXERCISES hardcoded בתוך הקומפוננט
**בעיה:** מערך `GYM_EXERCISES` עם עשרות תרגילים מוגדר בתוך קובץ הקומפוננט. זה מגדיל את גודל הbundle ומקשה על תחזוקה.  
**תיקון:** הוצא את `GYM_EXERCISES` לקובץ `src/data/gymExercises.ts`.

### 19. `src/data/mockProgress.ts` — תאריכים hardcoded שעברו
**בעיה:** `mockWorkoutHistory` מכיל תאריכים כמו `'2026-05-03'` שהם בעבר. אם הקוד אי פעם מציג אותם, הם נראים ישנים.  
**תיקון:** אם הם בשימוש (לtest/dev בלבד) — המר לתאריכים יחסיים: `new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)`. אם לא בשימוש — שקול להסיר את הקובץ.

### 20. `src/context/UserContext.tsx` — חשוב לבדוק
**בעיה פוטנציאלית:** `cloudSynced` state משפיע על כל ה-routing (ProtectedRoute מחכה לו). אם ה-sync נתקע, המשתמש תקוע על "טוען..." לנצח.  
**תיקון:** הוסף timeout של 8 שניות: אם `cloudSynced` עדיין `false` אחרי 8 שניות — הגדר אותו ל-`true` ועבוד עם הנתונים המקומיים. הוסף console.warn במקרה כזה.

---

## סיכום לפי עדיפות

| עדיפות | מספר | תיאור קצר |
|--------|------|-----------|
| 🔴 עכשיו | 1–5 | Mock data גלוי, מאקרו שגוי, AI prompt שבור |
| 🟠 השבוע | 6–9 | Cache TTL, JS files, Social mock, History |
| 🟡 הספרינט הבא | 10–16 | UX, Supabase errors, MET accuracy |
| 🟢 tech debt | 17–20 | Code quality, hardcoded data |

---

## הוראות לClaudeCode / Codex

- **אל תמחק mock data files** (`src/data/mock*.ts`) — ייתכן שנדרשים ל-fallback או testing. רק הסר את ה-imports מהקומפוננטים שמשתמשים בהם כנתוני production.
- **עבוד קובץ-קובץ** — אל תשנה יותר מ-3 קבצים בcommit אחד.
- **שמור על TypeScript** — אל תוסיף `as any` כפתרון קל.
- **בדוק לפני כל שינוי** שה-`npm run build` עובר ללא errors.
