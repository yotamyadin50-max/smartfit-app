import { getHybridAiReply, handleFallback, sanitizeUserMessage } from './lib/aiClient'

const AI_TOOLS_SELECTOR = '#sf-ai-tools-area'
const PROFILE_STORAGE_KEY = 'smartfit_ai_tools_profile'
const PROGRESS_STORAGE_KEY = 'smartfit_ai_tools_progress'
const DISCLAIMER_HE = 'המידע הוא כללי בלבד ואינו מחליף ייעוץ מקצועי'
const DISCLAIMER_EN = 'The information is general only and does not replace professional advice'
const WEEK_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const uiText = {
  he: {
    title: 'מערכת חכמה לתזונה, אימונים והתקדמות',
    subtitle: 'פרופיל אישי, מתכונים לפי מצרכים, אימונים מותאמים, מעקב מטרות וגרף שבועי - הכל נשמר בדפדפן בלבד.',
    profileTitle: 'פרופיל משתמש',
    profileSub: 'הנתונים משמשים להתאמה אישית של האימונים והמתכונים.',
    name: 'שם',
    namePlaceholder: 'לדוגמה: יותם',
    age: 'גיל',
    profileGoal: 'מטרה',
    cut: 'חיטוב',
    strength: 'כוח',
    endurance: 'סיבולת',
    health: 'בריאות כללית',
    fitness: 'כללי',
    flexibility: 'גמישות',
    level: 'רמת כושר',
    beginner: 'מתחיל',
    intermediate: 'בינוני',
    advanced: 'מתקדם',
    weeklyTarget: 'אימונים רצויים בשבוע',
    preferredDuration: 'זמן אימון מועדף',
    saveProfile: 'שמור פרופיל',
    profileSaved: 'הפרופיל נשמר.',
    recipeTitle: 'מתכון לפי מצרכים',
    recipeSub: 'כתוב מצרכים ובחר סוג ארוחה לקבלת מתכון מסודר.',
    ingredients: 'מצרכים שיש בבית',
    ingredientsPlaceholder: 'לדוגמה: ביצים, אורז, עגבניות, יוגורט, טונה',
    mealType: 'סוג ארוחה',
    breakfast: 'בוקר',
    lunch: 'צהריים',
    dinner: 'ערב',
    snack: 'נשנוש',
    generateRecipe: 'צור מתכון',
    workoutTitle: 'יצירת תוכנית אימון',
    workoutSub: 'הכלי מתחשב בפרופיל ובהיסטוריית ההתקדמות.',
    workoutGoal: 'מטרת אימון',
    duration: 'זמן אימון',
    minutes: 'דקות',
    generateWorkout: 'צור אימון',
    completeWorkout: 'סיימתי אימון',
    completionHint: 'שמירה מוסיפה אימון שהושלם להיסטוריה.',
    loadingRecipe: 'ה-AI חושב על מתכון...',
    loadingWorkout: 'ה-AI בונה אימון בטוח...',
    recipeResult: 'הצעת מתכון',
    workoutResult: 'הצעת אימון',
    retrying: 'החיבור נכשל. מנסה שוב פעם אחת...',
    error: 'השירות לא זמין כרגע, נסה שוב מאוחר יותר.',
    required: 'צריך למלא מצרכים לפני יצירת מתכון.',
    savedWorkout: 'האימון נשמר בהיסטוריה.',
    progressTitle: 'מעקב התקדמות',
    progressSub: 'אימונים נשמרים ב-localStorage בלבד.',
    totalWorkouts: 'אימונים',
    weekWorkouts: 'השבוע',
    monthWorkouts: 'החודש',
    dayStreak: 'רצף ימים',
    weekStreak: 'רצף שבועות',
    totalMinutes: 'דקות כולל',
    targetRate: 'עמידה ביעד',
    weeklyChart: 'גרף אימונים השבוע',
    weeklySummary: 'סיכום שבועי',
    history: 'היסטוריית אימונים',
    noHistory: 'עדיין אין אימונים שמורים.',
    adaptation: 'התאמה חכמה',
    adviceRaise: 'נראה שעמדת ביעד השבועי, אפשר להעלות מעט את רמת הקושי.',
    adviceEase: 'נראה שפספסת חלק גדול מהיעד, נציע תוכנית קלה ובטוחה יותר.',
    adviceShorter: 'נראה שהיו מעט אימונים, כדאי להתחיל באימונים קצרים יותר.',
    adviceSteady: 'הקצב נראה מאוזן, נמשיך בהתקדמות הדרגתית.',
    clearHistory: 'נקה היסטוריה',
    completed: 'הושלם',
    notCompleted: 'לא הושלם',
    savedAt: 'נשמר',
    daySun: 'א',
    dayMon: 'ב',
    dayTue: 'ג',
    dayWed: 'ד',
    dayThu: 'ה',
    dayFri: 'ו',
    daySat: 'ש',
  },
  en: {
    title: 'Smart Nutrition, Training & Progress System',
    subtitle: 'Personal profile, ingredient recipes, adaptive workouts, goal tracking, and a weekly chart stored in this browser only.',
    profileTitle: 'User Profile',
    profileSub: 'These details personalize recipes, workouts, and progress guidance.',
    name: 'Name',
    namePlaceholder: 'Example: Alex',
    age: 'Age',
    profileGoal: 'Goal',
    cut: 'Tone / fat loss',
    strength: 'Strength',
    endurance: 'Endurance',
    health: 'General health',
    fitness: 'General',
    flexibility: 'Flexibility',
    level: 'Fitness level',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    weeklyTarget: 'Desired workouts per week',
    preferredDuration: 'Preferred workout time',
    saveProfile: 'Save Profile',
    profileSaved: 'Profile saved.',
    recipeTitle: 'Recipe From Ingredients',
    recipeSub: 'Add ingredients and choose a meal type to get a structured recipe.',
    ingredients: 'Ingredients at home',
    ingredientsPlaceholder: 'Example: eggs, rice, tomatoes, yogurt, tuna',
    mealType: 'Meal type',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    generateRecipe: 'Generate Recipe',
    workoutTitle: 'Workout Plan Generator',
    workoutSub: 'Uses your profile and saved progress history.',
    workoutGoal: 'Workout goal',
    duration: 'Workout time',
    minutes: 'minutes',
    generateWorkout: 'Generate Workout',
    completeWorkout: 'I Finished This Workout',
    completionHint: 'Saving adds a completed workout to your history.',
    loadingRecipe: 'AI is thinking about a recipe...',
    loadingWorkout: 'AI is building a safe workout...',
    recipeResult: 'Recipe Suggestion',
    workoutResult: 'Workout Suggestion',
    retrying: 'Connection failed. Trying once more...',
    error: 'The AI service is not available right now. Please try again later.',
    required: 'Please add ingredients before generating a recipe.',
    savedWorkout: 'Workout saved to history.',
    progressTitle: 'Progress Tracking',
    progressSub: 'Workout data is saved in localStorage only.',
    totalWorkouts: 'Workouts',
    weekWorkouts: 'This week',
    monthWorkouts: 'This month',
    dayStreak: 'Day streak',
    weekStreak: 'Week streak',
    totalMinutes: 'Total minutes',
    targetRate: 'Target rate',
    weeklyChart: 'Weekly workout chart',
    weeklySummary: 'Weekly Summary',
    history: 'Workout History',
    noHistory: 'No saved workouts yet.',
    adaptation: 'Smart Adjustment',
    adviceRaise: 'You hit your weekly target, so we can raise difficulty slightly.',
    adviceEase: 'You missed a lot of the target, so we will suggest an easier and safer plan.',
    adviceShorter: 'You trained only a little, so shorter workouts are a better starting point.',
    adviceSteady: 'Your pace looks balanced, so we will keep progressing gradually.',
    clearHistory: 'Clear History',
    completed: 'Completed',
    notCompleted: 'Not completed',
    savedAt: 'Saved',
    daySun: 'S',
    dayMon: 'M',
    dayTue: 'T',
    dayWed: 'W',
    dayThu: 'T',
    dayFri: 'F',
    daySat: 'S',
  },
}

function getLanguage() {
  try {
    const storedLanguage = JSON.parse(window.localStorage.getItem('smartfit_language') || 'null')
    if (storedLanguage === 'he' || storedLanguage === 'en') return storedLanguage
  } catch {
    // Fall back to the document language if localStorage is unavailable or invalid.
  }

  return document.documentElement.lang === 'he' ? 'he' : 'en'
}

function getCopy() {
  return uiText[getLanguage()]
}

function getDisclaimer() {
  return getLanguage() === 'he' ? DISCLAIMER_HE : DISCLAIMER_EN
}

function createOption(value, label, selectedValue) {
  return `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${label}</option>`
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function getDefaultProfile() {
  return {
    name: '',
    age: 28,
    goal: 'health',
    level: 'beginner',
    weeklyTarget: 3,
    preferredDuration: 20,
  }
}

function normalizeProfile(value) {
  const fallback = getDefaultProfile()
  if (!value || typeof value !== 'object') return fallback
  return {
    name: typeof value.name === 'string' ? value.name.slice(0, 40) : fallback.name,
    age: clampNumber(value.age, 13, 90, fallback.age),
    goal: ['cut', 'strength', 'endurance', 'health'].includes(value.goal) ? value.goal : fallback.goal,
    level: ['beginner', 'intermediate', 'advanced'].includes(value.level) ? value.level : fallback.level,
    weeklyTarget: clampNumber(value.weeklyTarget, 1, 7, fallback.weeklyTarget),
    preferredDuration: [10, 20, 30].includes(Number(value.preferredDuration)) ? Number(value.preferredDuration) : fallback.preferredDuration,
  }
}

function readProfile() {
  try {
    return normalizeProfile(JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || 'null'))
  } catch {
    return getDefaultProfile()
  }
}

function writeProfile(profile) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(profile)))
}

function normalizeWorkoutEntry(value) {
  if (!value || typeof value !== 'object') return null
  const date = typeof value.date === 'string' ? value.date : ''
  const time = new Date(date).getTime()
  if (!Number.isFinite(time)) return null
  return {
    id: typeof value.id === 'string' ? value.id : `${time}`,
    date,
    type: typeof value.goal === 'string' && value.type === 'workout'
      ? value.goal
      : (typeof value.type === 'string' ? value.type : (typeof value.goal === 'string' ? value.goal : 'fitness')),
    duration: clampNumber(value.duration, 1, 240, 20),
    difficulty: typeof value.difficulty === 'string' ? value.difficulty : (typeof value.level === 'string' ? value.level : 'beginner'),
    completed: value.completed !== false,
  }
}

function readProgress() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeWorkoutEntry).filter(Boolean) : []
  } catch {
    return []
  }
}

function writeProgress(entries) {
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(entries.slice(0, 120)))
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date) {
  const next = startOfDay(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function getCompletedEntries(entries) {
  return entries.filter(entry => entry.completed)
}

function getWeekEntries(entries) {
  const weekStart = startOfWeek(new Date()).getTime()
  return entries.filter(entry => new Date(entry.date).getTime() >= weekStart)
}

function getMonthEntries(entries) {
  const now = new Date()
  return entries.filter(entry => {
    const date = new Date(entry.date)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })
}

function getDayStreak(entries) {
  const days = new Set(getCompletedEntries(entries).map(entry => startOfDay(new Date(entry.date)).getTime()))
  let cursor = startOfDay(new Date())
  let streak = 0

  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1)
  while (days.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function getWeekStreak(entries) {
  const weekStarts = new Set(getCompletedEntries(entries).map(entry => startOfWeek(new Date(entry.date)).getTime()))
  let cursor = startOfWeek(new Date())
  let streak = 0

  if (!weekStarts.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7)
  while (weekStarts.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }

  return streak
}

function getWeeklyChart(entries) {
  const completed = getWeekEntries(getCompletedEntries(entries))
  return WEEK_DAYS.map((day, index) => ({
    day,
    count: completed.filter(entry => new Date(entry.date).getDay() === index).length,
  }))
}

function getProgressStats(entries, profile) {
  const completed = getCompletedEntries(entries)
  const weeklyEntries = getWeekEntries(completed)
  const monthlyEntries = getMonthEntries(completed)
  const totalMinutes = completed.reduce((sum, entry) => sum + entry.duration, 0)
  const weeklyMinutes = weeklyEntries.reduce((sum, entry) => sum + entry.duration, 0)
  const targetPercent = Math.min(100, Math.round((weeklyEntries.length / profile.weeklyTarget) * 100))

  return {
    total: completed.length,
    weeklyCount: weeklyEntries.length,
    monthlyCount: monthlyEntries.length,
    weeklyMinutes,
    totalMinutes,
    targetPercent,
    dayStreak: getDayStreak(entries),
    weekStreak: getWeekStreak(entries),
  }
}

function getAdaptiveAdvice(entries, profile) {
  const t = getCopy()
  const stats = getProgressStats(entries, profile)
  if (stats.targetPercent >= 100) return { levelBias: 'raise slightly', text: t.adviceRaise }
  if (stats.targetPercent < 50 && stats.weeklyCount > 1) return { levelBias: 'make easier', text: t.adviceEase }
  if (stats.weeklyCount <= 1) return { levelBias: 'shorter workouts', text: t.adviceShorter }
  return { levelBias: 'steady progression', text: t.adviceSteady }
}

function formatEntryDate(date) {
  const language = getLanguage() === 'he' ? 'he-IL' : 'en-US'
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function getProfileFromForm(root) {
  return normalizeProfile({
    name: root.querySelector('#sf-ai-profile-name').value.trim(),
    age: root.querySelector('#sf-ai-profile-age').value,
    goal: root.querySelector('#sf-ai-profile-goal').value,
    level: root.querySelector('#sf-ai-profile-level').value,
    weeklyTarget: root.querySelector('#sf-ai-profile-target').value,
    preferredDuration: root.querySelector('#sf-ai-profile-duration').value,
  })
}

function getSelectedWorkoutData(root) {
  return {
    type: root.querySelector('#sf-ai-tools-goal').value,
    difficulty: root.querySelector('#sf-ai-tools-level').value,
    duration: clampNumber(root.querySelector('#sf-ai-tools-duration').value, 10, 30, 20),
    completed: true,
  }
}

function renderChart(root, entries) {
  const t = getCopy()
  const chart = root.querySelector('[data-role="weekly-chart"]')
  const chartData = getWeeklyChart(entries)
  const maxCount = Math.max(1, ...chartData.map(item => item.count))

  chart.innerHTML = ''
  chartData.forEach(item => {
    const bar = document.createElement('div')
    bar.className = 'sf-ai-tools-chart-bar'
    bar.innerHTML = `
      <span style="height: ${Math.max(8, (item.count / maxCount) * 100)}%"></span>
      <b>${item.count}</b>
      <small>${t[`day${item.day[0].toUpperCase()}${item.day.slice(1)}`]}</small>
    `
    chart.appendChild(bar)
  })
}

function renderProgress(root) {
  const t = getCopy()
  const entries = readProgress()
  const profile = readProfile()
  const stats = getProgressStats(entries, profile)
  const advice = getAdaptiveAdvice(entries, profile)
  const history = root.querySelector('[data-role="progress-history"]')

  root.querySelector('[data-role="total-workouts"]').textContent = String(stats.total)
  root.querySelector('[data-role="weekly-workouts"]').textContent = String(stats.weeklyCount)
  root.querySelector('[data-role="monthly-workouts"]').textContent = String(stats.monthlyCount)
  root.querySelector('[data-role="day-streak"]').textContent = String(stats.dayStreak)
  root.querySelector('[data-role="week-streak"]').textContent = String(stats.weekStreak)
  root.querySelector('[data-role="total-minutes"]').textContent = String(stats.totalMinutes)
  root.querySelector('[data-role="target-percent"]').textContent = `${stats.targetPercent}%`
  root.querySelector('[data-role="target-fill"]').style.width = `${stats.targetPercent}%`
  root.querySelector('[data-role="adaptive-advice"]').textContent = advice.text
  root.querySelector('[data-role="weekly-summary"]').textContent =
    `${stats.weeklyCount}/${profile.weeklyTarget} · ${stats.weeklyMinutes} ${t.minutes}`

  renderChart(root, entries)

  history.innerHTML = ''
  if (entries.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'sf-ai-tools-empty'
    empty.textContent = t.noHistory
    history.appendChild(empty)
    return
  }

  entries.slice(0, 10).forEach(entry => {
    const item = document.createElement('div')
    item.className = 'sf-ai-tools-history-item'
    item.innerHTML = `
      <div>
        <strong>${t[entry.type] ?? entry.type}</strong>
        <span>${formatEntryDate(entry.date)} · ${t[entry.difficulty] ?? entry.difficulty} · ${entry.completed ? t.completed : t.notCompleted}</span>
      </div>
      <b>${entry.duration} ${t.minutes}</b>
    `
    history.appendChild(item)
  })
}

function saveCompletedWorkout(root) {
  const t = getCopy()
  const workoutData = getSelectedWorkoutData(root)
  const entries = readProgress()
  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    ...workoutData,
  }

  writeProgress([nextEntry, ...entries])
  setStatus(root, 'workout', t.savedWorkout, 'success')
  renderProgress(root)
}

function renderAITools(root) {
  if (root.dataset.sfAiToolsReady === 'true') return
  root.dataset.sfAiToolsReady = 'true'

  const t = getCopy()
  const profile = readProfile()
  root.innerHTML = `
    <div class="sf-ai-tools-shell">
      <div class="sf-ai-tools-hero">
        <p class="sf-ai-tools-kicker">SmartFit AI</p>
        <h2 class="sf-ai-tools-heading">${t.title}</h2>
        <p class="sf-ai-tools-copy">${t.subtitle}</p>
        <p class="sf-ai-tools-disclaimer">${getDisclaimer()}.</p>
      </div>

      <div class="sf-ai-tools-grid">
        <form class="sf-ai-tools-card sf-ai-tools-profile-form">
          <div class="sf-ai-tools-card-head">
            <span class="sf-ai-tools-icon">ID</span>
            <div>
              <h3>${t.profileTitle}</h3>
              <p>${t.profileSub}</p>
            </div>
          </div>

          <div class="sf-ai-tools-form-grid">
            <label class="sf-ai-tools-field">
              <span>${t.name}</span>
              <input id="sf-ai-profile-name" class="sf-ai-tools-input" maxlength="40" placeholder="${t.namePlaceholder}" value="${escapeAttr(profile.name)}">
            </label>
            <label class="sf-ai-tools-field">
              <span>${t.age}</span>
              <input id="sf-ai-profile-age" class="sf-ai-tools-input" type="number" min="13" max="90" value="${profile.age}">
            </label>
            <label class="sf-ai-tools-field">
              <span>${t.profileGoal}</span>
              <select id="sf-ai-profile-goal" class="sf-ai-tools-input">
                ${createOption('cut', t.cut, profile.goal)}
                ${createOption('strength', t.strength, profile.goal)}
                ${createOption('endurance', t.endurance, profile.goal)}
                ${createOption('health', t.health, profile.goal)}
              </select>
            </label>
            <label class="sf-ai-tools-field">
              <span>${t.level}</span>
              <select id="sf-ai-profile-level" class="sf-ai-tools-input">
                ${createOption('beginner', t.beginner, profile.level)}
                ${createOption('intermediate', t.intermediate, profile.level)}
                ${createOption('advanced', t.advanced, profile.level)}
              </select>
            </label>
            <label class="sf-ai-tools-field">
              <span>${t.weeklyTarget}</span>
              <input id="sf-ai-profile-target" class="sf-ai-tools-input" type="number" min="1" max="7" value="${profile.weeklyTarget}">
            </label>
            <label class="sf-ai-tools-field">
              <span>${t.preferredDuration}</span>
              <select id="sf-ai-profile-duration" class="sf-ai-tools-input">
                ${createOption('10', `10 ${t.minutes}`, String(profile.preferredDuration))}
                ${createOption('20', `20 ${t.minutes}`, String(profile.preferredDuration))}
                ${createOption('30', `30 ${t.minutes}`, String(profile.preferredDuration))}
              </select>
            </label>
          </div>
          <button class="sf-ai-tools-button" type="submit">${t.saveProfile}</button>
          <div class="sf-ai-tools-status" data-role="profile-status" aria-live="polite"></div>
        </form>

        <form class="sf-ai-tools-card sf-ai-tools-recipe-form">
          <div class="sf-ai-tools-card-head">
            <span class="sf-ai-tools-icon">MEAL</span>
            <div>
              <h3>${t.recipeTitle}</h3>
              <p>${t.recipeSub}</p>
            </div>
          </div>

          <label class="sf-ai-tools-label" for="sf-ai-tools-ingredients">${t.ingredients}</label>
          <textarea id="sf-ai-tools-ingredients" class="sf-ai-tools-input sf-ai-tools-textarea" rows="4" maxlength="500" placeholder="${t.ingredientsPlaceholder}"></textarea>

          <label class="sf-ai-tools-label" for="sf-ai-tools-meal">${t.mealType}</label>
          <select id="sf-ai-tools-meal" class="sf-ai-tools-input">
            ${createOption('breakfast', t.breakfast)}
            ${createOption('lunch', t.lunch)}
            ${createOption('dinner', t.dinner)}
            ${createOption('snack', t.snack)}
          </select>

          <button class="sf-ai-tools-button" type="submit">${t.generateRecipe}</button>
          <div class="sf-ai-tools-status" data-role="recipe-status" aria-live="polite"></div>
          <article class="sf-ai-tools-result" data-role="recipe-result" hidden>
            <h4>${t.recipeResult}</h4>
            <pre></pre>
          </article>
        </form>

        <form class="sf-ai-tools-card sf-ai-tools-workout-form">
          <div class="sf-ai-tools-card-head">
            <span class="sf-ai-tools-icon">FIT</span>
            <div>
              <h3>${t.workoutTitle}</h3>
              <p>${t.workoutSub}</p>
            </div>
          </div>

          <label class="sf-ai-tools-label" for="sf-ai-tools-goal">${t.workoutGoal}</label>
          <select id="sf-ai-tools-goal" class="sf-ai-tools-input">
            ${createOption('fitness', t.fitness, profile.goal === 'health' || profile.goal === 'cut' ? 'fitness' : profile.goal)}
            ${createOption('strength', t.strength, profile.goal)}
            ${createOption('endurance', t.endurance, profile.goal)}
            ${createOption('flexibility', t.flexibility)}
          </select>

          <label class="sf-ai-tools-label" for="sf-ai-tools-level">${t.level}</label>
          <select id="sf-ai-tools-level" class="sf-ai-tools-input">
            ${createOption('beginner', t.beginner, profile.level)}
            ${createOption('intermediate', t.intermediate, profile.level)}
            ${createOption('advanced', t.advanced, profile.level)}
          </select>

          <label class="sf-ai-tools-label" for="sf-ai-tools-duration">${t.duration}</label>
          <select id="sf-ai-tools-duration" class="sf-ai-tools-input">
            ${createOption('10', `10 ${t.minutes}`, String(profile.preferredDuration))}
            ${createOption('20', `20 ${t.minutes}`, String(profile.preferredDuration))}
            ${createOption('30', `30 ${t.minutes}`, String(profile.preferredDuration))}
          </select>

          <button class="sf-ai-tools-button" type="submit">${t.generateWorkout}</button>
          <button class="sf-ai-tools-button sf-ai-tools-button-ghost" type="button" data-action="complete-workout">${t.completeWorkout}</button>
          <p class="sf-ai-tools-mini-note">${t.completionHint}</p>
          <div class="sf-ai-tools-status" data-role="workout-status" aria-live="polite"></div>
          <article class="sf-ai-tools-result" data-role="workout-result" hidden>
            <h4>${t.workoutResult}</h4>
            <pre></pre>
          </article>
        </form>

        <section class="sf-ai-tools-card sf-ai-tools-progress-card">
          <div class="sf-ai-tools-card-head">
            <span class="sf-ai-tools-icon">STAT</span>
            <div>
              <h3>${t.progressTitle}</h3>
              <p>${t.progressSub}</p>
            </div>
          </div>

          <div class="sf-ai-tools-stat-grid wide">
            <div class="sf-ai-tools-stat"><span data-role="total-workouts">0</span><small>${t.totalWorkouts}</small></div>
            <div class="sf-ai-tools-stat"><span data-role="weekly-workouts">0</span><small>${t.weekWorkouts}</small></div>
            <div class="sf-ai-tools-stat"><span data-role="monthly-workouts">0</span><small>${t.monthWorkouts}</small></div>
            <div class="sf-ai-tools-stat"><span data-role="day-streak">0</span><small>${t.dayStreak}</small></div>
            <div class="sf-ai-tools-stat"><span data-role="week-streak">0</span><small>${t.weekStreak}</small></div>
            <div class="sf-ai-tools-stat"><span data-role="total-minutes">0</span><small>${t.totalMinutes}</small></div>
          </div>

          <div class="sf-ai-tools-target-row">
            <div>
              <span>${t.targetRate}</span>
              <strong data-role="target-percent">0%</strong>
            </div>
            <div class="sf-ai-tools-target-track"><i data-role="target-fill"></i></div>
          </div>

          <div class="sf-ai-tools-advice">
            <span>${t.adaptation}</span>
            <p data-role="adaptive-advice"></p>
          </div>

          <div class="sf-ai-tools-week-summary">
            <span>${t.weeklySummary}</span>
            <strong data-role="weekly-summary"></strong>
          </div>

          <div>
            <div class="sf-ai-tools-history-head">
              <h4>${t.weeklyChart}</h4>
            </div>
            <div class="sf-ai-tools-chart" data-role="weekly-chart"></div>
          </div>

          <div class="sf-ai-tools-history-head">
            <h4>${t.history}</h4>
            <button type="button" class="sf-ai-tools-link-button" data-action="clear-history">${t.clearHistory}</button>
          </div>
          <div class="sf-ai-tools-history" data-role="progress-history"></div>
        </section>
      </div>
    </div>
  `

  const profileForm = root.querySelector('.sf-ai-tools-profile-form')
  const recipeForm = root.querySelector('.sf-ai-tools-recipe-form')
  const workoutForm = root.querySelector('.sf-ai-tools-workout-form')
  const completeButton = root.querySelector('[data-action="complete-workout"]')
  const clearHistoryButton = root.querySelector('[data-action="clear-history"]')

  profileForm.addEventListener('submit', event => {
    event.preventDefault()
    writeProfile(getProfileFromForm(root))
    setStatus(root, 'profile', t.profileSaved, 'success')
    renderProgress(root)
  })

  recipeForm.addEventListener('submit', event => {
    event.preventDefault()
    const ingredients = root.querySelector('#sf-ai-tools-ingredients').value.trim()
    const mealType = root.querySelector('#sf-ai-tools-meal').value

    if (!ingredients) {
      setStatus(root, 'recipe', t.required, 'error')
      return
    }

    const currentProfile = getProfileFromForm(root)
    const language = getLanguage() === 'he' ? 'Hebrew' : 'English'
    const prompt = [
      `Create a structured, safe, general healthy recipe suggestion in ${language}.`,
      `User profile: age ${currentProfile.age}, goal ${currentProfile.goal}, fitness level ${currentProfile.level}.`,
      `Meal type: ${mealType}.`,
      `Available ingredients: ${ingredients}.`,
      'Use only the ingredients listed by the user. Do not add other foods. You may use only water, salt, pepper, or basic spices if needed.',
      `The full answer must be in ${language}.`,
      'Return clear sections only:',
      '1. Recipe name',
      '2. Ingredients',
      '3. Preparation steps',
      '4. Estimated preparation time',
      '5. General health note',
      'Do not suggest extreme diets. Do not promise weight loss. Do not give medical advice.',
      `Include this exact disclaimer: ${getDisclaimer()}.`,
    ].join('\n')

    runAiRequest(root, 'recipe', prompt, t.loadingRecipe)
  })

  workoutForm.addEventListener('submit', event => {
    event.preventDefault()
    const currentProfile = getProfileFromForm(root)
    const workout = getSelectedWorkoutData(root)
    const language = getLanguage() === 'he' ? 'Hebrew' : 'English'
    const advice = getAdaptiveAdvice(readProgress(), currentProfile)

    const prompt = [
      `Create a safe basic workout plan in ${language}.`,
      `User profile: name ${currentProfile.name || 'not provided'}, age ${currentProfile.age}, general goal ${currentProfile.goal}, level ${currentProfile.level}, weekly target ${currentProfile.weeklyTarget}.`,
      `Workout request: goal ${workout.type}, difficulty ${workout.difficulty}, duration ${workout.duration} minutes.`,
      `Progress adjustment: ${advice.levelBias}.`,
      'Return clear sections only:',
      '1. Short warm-up',
      '2. Main workout with exercises, sets, reps or timed blocks',
      '3. Rest times between exercises',
      'For each exercise, add a short 2-3 line explanation only: brief execution, key technique cue, and one machine-use sentence if relevant.',
      '4. Cool-down',
      '5. Safety note',
      'Keep it general and safe. Avoid extreme or dangerous recommendations. Do not give medical advice.',
      `Include this exact disclaimer: ${getDisclaimer()}.`,
    ].join('\n')

    runAiRequest(root, 'workout', prompt, t.loadingWorkout)
  })

  completeButton.addEventListener('click', () => saveCompletedWorkout(root))
  clearHistoryButton.addEventListener('click', () => {
    writeProgress([])
    renderProgress(root)
  })

  renderProgress(root)
}

function setStatus(root, type, message, state = '') {
  const status = root.querySelector(`[data-role="${type}-status"]`)
  status.textContent = message
  status.className = `sf-ai-tools-status${state ? ` ${state}` : ''}`
}

function setResult(root, type, text) {
  const result = root.querySelector(`[data-role="${type}-result"]`)
  result.hidden = false
  result.querySelector('pre').textContent = text
}

function setFormLoading(root, type, isLoading) {
  const form = root.querySelector(`.sf-ai-tools-${type}-form`)
  form.querySelectorAll('button, input, select, textarea').forEach(element => {
    element.disabled = isLoading
  })
}

async function runAiRequest(root, type, prompt, loadingText) {
  const t = getCopy()
  setFormLoading(root, type, true)
  setStatus(root, type, loadingText, 'loading')

  try {
    const answer = await fetchAiText(prompt, () => setStatus(root, type, t.retrying, 'loading'))
    setResult(root, type, answer.trim() || t.error)
    setStatus(root, type, '', '')
  } catch (error) {
    console.log('SmartFit AI tools final failure', error)
    const fallback = handleFallback({ userMessage: prompt })
    setResult(root, type, `[${fallback.modeLabel}]\n${fallback.text}`)
    setStatus(root, type, '', '')
  } finally {
    setFormLoading(root, type, false)
  }
}

async function fetchAiText(prompt, onRetry) {
  const cleanPrompt = sanitizeUserMessage(prompt)
  if (!cleanPrompt) {
    const fallback = handleFallback({ userMessage: 'שאלה כללית על כושר ותזונה' })
    return `[${fallback.modeLabel}]\n${fallback.text}`
  }

  onRetry?.()
  const reply = await getHybridAiReply({ prompt, userMessage: cleanPrompt })
  return reply.mode === 'openrouter' ? reply.text : `[${reply.modeLabel}]\n${reply.text}`
}

function initAITools() {
  const root = document.querySelector(AI_TOOLS_SELECTOR)
  if (root) renderAITools(root)
}

initAITools()

const aiToolsObserver = new MutationObserver(initAITools)
aiToolsObserver.observe(document.body, { childList: true, subtree: true })
