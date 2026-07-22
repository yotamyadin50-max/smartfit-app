# פרומפט לקלוד קוד — שיפור מערכת האימון של FITNESS AI

## הקשר
אתה עובד על אפליקציית Android בשם FITNESS AI. האפליקציה בנויה ב-React + TypeScript + Capacitor.
הקבצים הרלוונטיים למשימה זו:
- `src/pages/WorkoutPage.tsx` — הקובץ הראשי (~2064 שורות). מכיל את כל לוגיקת האימון.
- `src/pages/TrainingPlanPage.tsx` — תכנון תוכנית שבועית.
- `src/pages/WorkoutSummaryPage.tsx` — סיכום אימון + XP.
- `src/data/mockWorkouts.ts` — נתוני תרגילים ואימונים.
- `src/context/UserContext.tsx` — טיפוסים ופרופיל משתמש.
- `src/progressStorage.ts` — שמירת היסטוריית אימונים.

**כלל ברזל:** לפני כל שינוי קרא את הקובץ המלא. אל תשנה שורה שלא הבנת.

---

## משימות לביצוע — לפי סדר עדיפות

---

### 1. תיקון באג: שמות תרגילים ב-wger מוצגים באנגלית גם בממשק עברי

**קובץ:** `src/pages/WorkoutPage.tsx`
**פונקציה:** `buildHomeWorkoutFromWger`

כרגע השורה:
```ts
nameHe: ex.name,
```
משתמשת בשם האנגלי. תצטרך לבדוק אם `ex` מכיל שדה עברי (לא סביר, ה-API אנגלי בלבד).
**הפתרון:** שמור את השם האנגלי גם ב-`nameHe`, אבל הוסף prefix עברי לפי הקטגוריה. לדוגמה, אם `choice === 'abs'` — תוסיף "(בטן) Push-Up". תצטרך פונקציה קטנה:
```ts
function hebrewCategoryPrefix(choice: HomeWorkoutCategory): string {
  const map: Record<HomeWorkoutCategory, string> = {
    abs: 'בטן', arms: 'ידיים', back: 'גב', chest: 'חזה', legs: 'רגליים', goal: ''
  }
  return map[choice] ?? ''
}
```
ואז: `nameHe: prefix ? \`(\${prefix}) \${ex.name}\` : ex.name`

---

### 2. תיקון באג: `analyzeGymProgress` סופר אימונים לא-gym

**קובץ:** `src/pages/WorkoutPage.tsx`
**פונקציה:** `analyzeGymProgress`

כרגע `progress.filter(...)` לא מסנן לפי `type`. תוסיף:
```ts
const gymProgress = progress.filter(entry => entry.type === 'gym')
// ואז השתמש ב-gymProgress במקום progress בכל החישובים בפונקציה
```
בדוק מה השדה המדויק ב-`WorkoutProgressEntry` (ב-`progressStorage.ts`) לפני שאתה כותב.

---

### 3. הוספת `chest` כ-ScheduleFocus בתוכנית שבועית

**קובץ:** `src/context/UserContext.tsx`
שנה את הטיפוס:
```ts
export type ScheduleFocus = 'goal' | 'abs' | 'arms' | 'legs' | 'back' | 'aerobic' | 'rest'
```
ל:
```ts
export type ScheduleFocus = 'goal' | 'abs' | 'arms' | 'legs' | 'back' | 'chest' | 'aerobic' | 'rest'
```

**קובץ:** `src/pages/TrainingPlanPage.tsx`
הוסף `chest` ל:
- `focusLabelKeys` — מפתח: `chestWorkout`
- `goalFocusOrder` — הוסף `chest` לתוכניות `bulk` ו-`fitness`

**קובץ:** `src/pages/WorkoutPage.tsx`
בפונקציה `focusToChoice` הוסף:
```ts
if (focus === 'chest') return 'chest'
```
בדוק גם שה-`ScheduleFocus` בכל מקום מטופל.

---

### 4. סינון תרגילים לפי `sensitiveAreas`

**קובץ:** `src/pages/WorkoutPage.tsx`

צור פונקציה חדשה:
```ts
function filterExercisesForSensitiveAreas(
  exercises: Exercise[],
  sensitiveAreas: SensitiveArea[]
): Exercise[]
```

הכללים:
- `knees` — הסר: Bulgarian Split Squat, Leg Extension, Smith Squat, Jump Squat (כל תרגיל שה-id שלו מכיל: `smith-squat`, `leg-extension`, `bulgarian`, `jump`)
- `back` — הסר: Good Morning, Single Leg Deadlift, Back Extension Hold, Romanian Deadlift (id: `good-morning`, `single-leg-deadlift`, `back-extension`, `romanian-deadlift`)
- `shoulders` — הסר: Pike Push-Up, Shoulder Press, Arnold Press (id: `pike`, `shoulder-press`, `arnold-press`, `machine-shoulder-press`)
- `neck` — הסר: תרגילים עם overhead press (id: `overhead`, `arnold-press`, `machine-shoulder-press`)
- `elbows` — הסר: Triceps Dips, Close-Grip Push-Up (id: `dips`, `close-grip`)
- `hips` — הסר: Hip Thrust, Hip Abduction, Hip Adduction (id: `hip-thrust`, `hip-abduction`, `hip-adduction`)
- `ankles` — הסר: Calf Raises, Standing Calf Raise (id: `calf`)

הפונקציה צריכה לסנן אבל **לא להחזיר פחות מ-3 תרגילים** — אם נשארים פחות מ-3, החזר את הרשימה המקורית עם warning log.

**שלב ב:** קרא את `sensitiveAreas` מ-`profile.health?.sensitiveAreas ?? []` והחל את הסינון:
- ב-`buildHomeWorkout` — אחרי `selectHomeExercises`
- ב-`buildGymWorkout` — אחרי `selectGymExerciseTemplates`

**שלב ג:** הוסף הערת UI — ב-`SelectWorkout`, אם יש `sensitiveAreas`, הצג:
```
⚠️ תרגילים מותאמים לפי האזורים הרגישים שלך: [רשימה]
```

---

### 5. סינכרון gym focus מהתוכנית השבועית

**קובץ:** `src/pages/WorkoutPage.tsx`

ב-`useEffect` שרץ ב-mount (השורה `// intentionally run only on mount`):

כרגע כשהיום הוא gym day, הקוד בונה אימון עם `gymFocuses` הכלליים מהפרופיל. שנה כך שאם ביום הזה יש focus ספציפי בתוכנית השבועית — תמפה אותו ל-GymFocus:

```ts
const focusToGymFocus = (focus: ScheduleFocus): GymFocus[] => {
  const map: Partial<Record<ScheduleFocus, GymFocus[]>> = {
    abs: ['abs'], arms: ['arms'], legs: ['legs'], back: ['back'], chest: ['chest'],
    goal: getDefaultGymFocuses(profile),
  }
  return map[focus] ?? getDefaultGymFocuses(profile)
}
```

ואז אם `isGymDay` — בנה עם `focusToGymFocus(todayFocus)` במקום `gymFocuses`.

---

### 6. XP פרופורציונלי למשך האימון

**קובץ:** `src/pages/WorkoutSummaryPage.tsx`

שנה `BASE_XP` מקבוע ל-פונקציה:
```ts
function calcBaseXP(durationMinutes: number): number {
  if (durationMinutes <= 10) return 60
  if (durationMinutes <= 20) return 90
  if (durationMinutes <= 30) return 110
  if (durationMinutes <= 45) return 130
  if (durationMinutes <= 60) return 155
  return 180
}
```

שים לב: ה-`WorkoutSummaryPage` מקבל `state` מה-navigate. בדוק אם `durationMin` מגיע ב-`location.state` — אם כן תשתמש בו, אחרת fallback ל-120.

---

### 7. שיפור קצב נוכחי ב-AerobicTracker

**קובץ:** `src/pages/WorkoutPage.tsx`
**קומפוננטה:** `AerobicTracker`

הוסף חישוב current pace:
```ts
const currentPacePerKm = distanceKm > 0
  ? (elapsed / 60) / distanceKm  // minutes per km
  : null

function formatPace(minutesPerKm: number): string {
  const min = Math.floor(minutesPerKm)
  const sec = Math.round((minutesPerKm - min) * 60)
  return `${min}:${sec.toString().padStart(2, '0')} / ק"מ`
}
```

הצג בממשק לצד הזמן:
- אם `currentPacePerKm` לא null ו->0 — הצג קצב נוכחי
- אם GPS לא פעיל — הצג "GPS לא פעיל"

הוסף גם progress bar שמציג elapsed/durationMinutes (עד ה-suggested duration שב-workout).

---

### 8. שמירת per-set feedback ל-history

**קובץ:** `src/progressStorage.ts`
בדוק את הטיפוס `WorkoutProgressEntry` — הוסף שדה אופציונלי:
```ts
setFeedback?: { exerciseId: string; setIndex: number; feeling: string }[]
```

**קובץ:** `src/pages/WorkoutPage.tsx`

ב-`WorkoutPage` component, הוסף state:
```ts
const [setFeedbackLog, setSetFeedbackLog] = useState<{ exerciseId: string; setIndex: number; feeling: string }[]>([])
```

ב-`handleSetDone`:
```ts
setSetFeedbackLog(prev => [...prev, { exerciseId: currentEx.id, setIndex, feeling: feedback }])
```

ב-`finishWorkout`, הוסף `setFeedback: setFeedbackLog` ל-`saveCompletedWorkout`.
בדוק ש-`saveCompletedWorkout` מקבל ושומר את השדה החדש.

---

### 9. pain feedback מוביל ל-suggestion

**קובץ:** `src/pages/WorkoutSummaryPage.tsx`

אחרי `handleFinish`, אם `pain === 'yes'`, לפני ה-navigate, שמור ב-localStorage:
```ts
localStorage.setItem('smartfit_pain_last_workout', 'true')
```

**קובץ:** `src/pages/WorkoutPage.tsx`

ב-`SelectWorkout`, בתחילת הrender, בדוק:
```ts
const hadPainLastWorkout = localStorage.getItem('smartfit_pain_last_workout') === 'true'
```

אם `true` — הצג banner:
```
⚠️ באימון האחרון דיווחת על כאב. שקול להפחית עומס או לבחור אימון קל יותר היום.
```
ולאחר הצגה — מחק את הkey (הצג פעם אחת בלבד).

---

### 10. תיקון: rest לאחר הסט האחרון של כל תרגיל — לא לפני תרגיל הבא

**קובץ:** `src/pages/WorkoutPage.tsx`
**פונקציה:** `goToNext`

כרגע כשמסיימים סט אחרון של תרגיל, עוברים ל-`rest` ואז ל-תרגיל הבא.
שנה כך שה-rest label יציג "מנוחה לפני: [שם התרגיל הבא]" במקום מנוחה גנרית.

ב-`RestTimer`, הוסף prop אופציונלי `nextExerciseName?: string` והצג אותו:
```tsx
{nextExerciseName && <p className="rest-next-label">הבא: {nextExerciseName}</p>}
```

ב-`WorkoutPage` render של `RestTimer`:
```tsx
<RestTimer
  seconds={currentEx.restSeconds}
  nextExerciseName={exercises[exIndex + 1] ? (isHebrew ? exercises[exIndex + 1].nameHe : exercises[exIndex + 1].name) : undefined}
  onDone={...}
  onSkip={...}
/>
```

---

## בדיקות אחרי כל שינוי

1. **TypeScript:** הרץ `npx tsc --noEmit` — אפס errors לפני ואחרי כל שינוי.
2. **Build:** הרץ `npm run build` — אפס errors.
3. **sensitiveAreas:** בדוק ידנית שמשתמש עם `knees: 'severe'` לא מקבל Leg Extension.
4. **chest in plan:** בדוק שניתן לשמור תוכנית שבועית עם chest ולראות אותה בWorkoutPage.
5. **wger names:** בדוק שבממשק עברי, תרגיל wger מוצג עם prefix עברי.

## סדר ביצוע מומלץ

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

כל משימה עצמאית — אפשר לעצור בכל שלב ולעשות build בדיקה.
