import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { useAuth } from '../context/AuthContext'
import { getWorkoutProgress, getCardioProgress } from '../progressStorage'
import { fetchAI } from '../lib/aiClient'
import { saveShredDataToSupabase } from '../lib/supabaseDb'

import {
  type FoodEntry,
  type WeightEntry,
  type SavedMeal,
  type ShredGoal,
  type ManualBurnEntry,
  todayStr,
  getFoodLog,
  addFoodEntry,
  removeFoodEntry,
  getWeightLog,
  addWeightEntry,
  getLatestWeight,
  getSavedMeals,
  saveMeal,
  deleteSavedMeal,
  getShredGoal,
  saveShredGoal,
  calculateDailyNeeds,
  estimateWorkoutCalories,
  estimateCaloriesFromHR,
  getMotivationalMessage,
  getManualBurnLog,
  addManualBurnEntry,
} from '../lib/shredStorage'
import { getCurrentHR, isHRConnected, onHeartRate } from '../lib/heartRate'
import { emitProgressEvent } from '../lib/achievementEvents'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'summary' | 'nutrition' | 'goals'

// ── USDA food search ──────────────────────────────────────────────────────────

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

interface UsdaFoodItem {
  fdcId: number
  description: string
  kcalPer100: number
  proteinPer100: number
  carbsPer100: number
  fatPer100: number
}

async function searchUSDA(query: string): Promise<UsdaFoodItem[]> {
  const url = `${API_BASE}/api/food?q=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`USDA ${res.status}`)
  const data = await res.json() as {
    foods?: Array<{
      fdcId: number
      description: string
      kcal: number
      protein: number
      carbs: number
      fat: number
    }>
  }
  return (data.foods ?? []).map(f => ({
    fdcId: f.fdcId,
    description: f.description,
    kcalPer100: f.kcal,
    proteinPer100: f.protein,
    carbsPer100: f.carbs,
    fatPer100: f.fat,
  }))
}

async function translateFoodNamesToHebrew(names: string[]): Promise<string[]> {
  if (names.length === 0) return []
  try {
    const prompt =
      `Translate these food names to short natural Hebrew (2-4 words max each). ` +
      `Reply ONLY a JSON array of strings, same order:\n` +
      JSON.stringify(names)
    const reply = await fetchAI(prompt)
    const match = reply.text.match(/\[[\s\S]*\]/)
    if (!match) return names
    const translated = JSON.parse(match[0]) as string[]
    return Array.isArray(translated) && translated.length === names.length ? translated : names
  } catch {
    return names
  }
}

async function translateQueryToEnglish(query: string): Promise<string> {
  // If query has Hebrew chars, translate to English for USDA
  if (!/[֐-׿]/.test(query)) return query
  try {
    const reply = await fetchAI(`Translate this Hebrew food name to English (2-4 words): "${query}". Reply with ONLY the English translation, nothing else.`)
    return reply.text.trim().replace(/^["']|["']$/g, '') || query
  } catch {
    return query
  }
}

// ── Meal label helpers ────────────────────────────────────────────────────────

function getMealLabels(count: number, isHebrew: boolean): string[] {
  const he = ['ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'נשנוש', 'ארוחה 5', 'ארוחה 6']
  const en = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Meal 5', 'Meal 6']
  return (isHebrew ? he : en).slice(0, Math.min(Math.max(count, 2), 6))
}

// ── Weight chart (SVG) ────────────────────────────────────────────────────────

function WeightChart({ entries, goal }: { entries: WeightEntry[]; goal: ShredGoal | null }) {
  const W = 300, H = 140
  const pad = { t: 16, r: 12, b: 28, l: 40 }

  if (entries.length < 1) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '14px 0', textAlign: 'center' }}>
        עדיין אין נתוני משקל — הכנס ביום ראשון הראשון
      </div>
    )
  }

  const allVals = [...entries.map(e => e.weightKg), ...(goal ? [goal.targetWeightKg] : [])]
  const minV = Math.min(...allVals) - 0.5
  const maxV = Math.max(...allVals) + 0.5
  const range = maxV - minV || 1

  const xOf = (i: number) => entries.length === 1
    ? (W - pad.l - pad.r) / 2 + pad.l
    : pad.l + (i / (entries.length - 1)) * (W - pad.l - pad.r)
  const yOf = (v: number) => pad.t + (1 - (v - minV) / range) * (H - pad.t - pad.b)

  const segments = entries.slice(1).map((entry, i) => ({
    x1: xOf(i), y1: yOf(entries[i].weightKg),
    x2: xOf(i + 1), y2: yOf(entry.weightKg),
    up: entry.weightKg > entries[i].weightKg,
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {[minV + 0.5, (minV + maxV) / 2, maxV - 0.5].map((v, i) => (
        <line key={i} x1={pad.l} y1={yOf(v)} x2={W - pad.r} y2={yOf(v)}
          stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      ))}

      {/* Target line */}
      {goal && (
        <line x1={pad.l} y1={yOf(goal.targetWeightKg)} x2={W - pad.r} y2={yOf(goal.targetWeightKg)}
          stroke="rgba(99,102,241,0.7)" strokeWidth={1.5} strokeDasharray="5,4" />
      )}

      {/* Colored segments */}
      {segments.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.up ? '#ef4444' : '#22c55e'} strokeWidth={2.5} strokeLinecap="round" />
      ))}

      {/* Dots */}
      {entries.map((e, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(e.weightKg)}
          r={i === entries.length - 1 ? 4.5 : 3}
          fill={i === entries.length - 1 ? '#fff' : 'rgba(255,255,255,0.55)'}
          stroke="rgba(0,0,0,0.3)" strokeWidth={1}
        />
      ))}

      {/* Y labels */}
      {[minV + 0.5, maxV - 0.5].map((v, i) => (
        <text key={i} x={pad.l - 5} y={yOf(v) + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.4)">
          {v.toFixed(1)}
        </text>
      ))}

      {/* X labels */}
      {entries.length >= 1 && (
        <text x={pad.l} y={H - 5} textAnchor="start" fontSize={9} fill="rgba(255,255,255,0.4)">
          {entries[0].date.slice(5)}
        </text>
      )}
      {entries.length >= 2 && (
        <text x={W - pad.r} y={H - 5} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.4)">
          {entries[entries.length - 1].date.slice(5)}
        </text>
      )}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShredPage() {
  const { profile } = useUser()
  const { user } = useAuth()
  const { isHebrew } = useI18n()

  const [tab, setTab]           = useState<Tab>('summary')
  const [foodLog, setFoodLog]   = useState<FoodEntry[]>(() => getFoodLog())
  const [weightLog, setWeightLog] = useState<WeightEntry[]>(() => getWeightLog())
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>(() => getSavedMeals())
  const [shredGoal, setShredGoal]   = useState<ShredGoal | null>(() => getShredGoal())

  // Add food modal
  const [showAddFood, setShowAddFood]       = useState(false)
  const [activeMeal, setActiveMeal]         = useState(0)
  const [addFoodTab, setAddFoodTab]         = useState<'usda' | 'ai'>('usda')
  // USDA tab
  const [foodQuery, setFoodQuery]           = useState('')
  const [usdaResults, setUsdaResults]       = useState<UsdaFoodItem[]>([])
  const [usdaLoading, setUsdaLoading]       = useState(false)
  const [usdaError, setUsdaError]           = useState('')
  const [selectedFood, setSelectedFood]     = useState<UsdaFoodItem | null>(null)
  const [foodGrams, setFoodGrams]           = useState('100')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // AI free-text tab
  const [aiInput, setAiInput]                   = useState('')
  const [aiFoodResult, setAiFoodResult]         = useState<{ kcal: number; protein: number; carbs: number; fat: number } | null>(null)
  const [aiFoodLoading, setAiFoodLoading]       = useState(false)
  const [aiFoodError, setAiFoodError]           = useState('')
  const aiAbortRef = useRef<AbortController | null>(null)

  // Sunday weight popup
  const isSunday = new Date().getDay() === 0
  const [showWeightPopup, setShowWeightPopup] = useState(() => {
    if (!isSunday) return false
    const last = getLatestWeight()
    return !last || last.date !== todayStr()
  })
  const [newWeight, setNewWeight] = useState(profile.weightKg?.toString() ?? '')

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalWeight, setGoalWeight]     = useState('')
  const [goalDate, setGoalDate]         = useState('')

  // AI suggestion
  const [whatIHave, setWhatIHave]       = useState('')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading]       = useState(false)

  // Manual burn log (includes auto-accumulated watch calories)
  const [manualBurnLog, setManualBurnLog] = useState<ManualBurnEntry[]>(() => getManualBurnLog())

  // Midnight reset — when the date changes, reload daily data so totals go to 0
  useEffect(() => {
    let lastDate = new Date().toISOString().slice(0, 10)
    const interval = setInterval(() => {
      const currentDate = new Date().toISOString().slice(0, 10)
      if (currentDate !== lastDate) {
        lastDate = currentDate
        setFoodLog(getFoodLog())
        setManualBurnLog(getManualBurnLog())
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Cloud sync — debounced save to Supabase whenever shred data changes
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!user) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      saveShredDataToSupabase(user.id, {
        foodLog:      JSON.parse(localStorage.getItem('smartfit_shred_food')         ?? '[]'),
        weightLog:    JSON.parse(localStorage.getItem('smartfit_shred_weight')       ?? '[]'),
        savedMeals:   JSON.parse(localStorage.getItem('smartfit_shred_saved_meals')  ?? '[]'),
        goal:         JSON.parse(localStorage.getItem('smartfit_shred_goal')         ?? 'null'),
        manualBurnLog: JSON.parse(localStorage.getItem('smartfit_shred_manual_burn') ?? '[]'),
      })
    }, 3000) // 3s debounce
  }, [user, foodLog, weightLog, savedMeals, shredGoal, manualBurnLog])

  // Smartwatch: accumulate calories from every HR event (works even if watch connects after page load)
  const watchAccumRef = useRef(0)
  const lastBpmRef    = useRef(0)

  useEffect(() => {
    const wt       = profile.weightKg ?? 70
    const age      = profile.age ?? 25
    const isFemale = profile.gender === 'female'

    const unsub = onHeartRate(bpm => {
      lastBpmRef.current = bpm
      if (bpm < 50) return  // resting / disconnected

      // HR events arrive ~every 1 second → kcal per event = kcalPerMin / 60
      const kcalPerMin = estimateCaloriesFromHR(bpm, 1, wt, age, isFemale)
      watchAccumRef.current += kcalPerMin / 60

      // Flush every ~10 kcal accumulated
      if (watchAccumRef.current >= 10) {
        addManualBurnEntry('cardio', 1, wt, Math.round(watchAccumRef.current), bpm)
        watchAccumRef.current = 0
        setManualBurnLog(getManualBurnLog())
      }
    })

    return () => {
      unsub()
      // Save remaining on unmount / profile change
      if (watchAccumRef.current >= 2) {
        addManualBurnEntry('cardio', 1, wt, Math.round(watchAccumRef.current), lastBpmRef.current)
        watchAccumRef.current = 0
        setManualBurnLog(getManualBurnLog())
      }
    }
  }, [profile.weightKg, profile.age, profile.gender])

  // Saved meal picker per slot (mealIdx → savedMealId already applied today)
  const [showSavedMealFor, setShowSavedMealFor]     = useState<number | null>(null)
  const [appliedSavedMeals, setAppliedSavedMeals]   = useState<Record<number, string>>({})


  // Celebration
  const [showCelebration, setShowCelebration] = useState(false)

  const t = (en: string, he: string) => isHebrew ? he : en

  const mealLabels = getMealLabels(profile.nutrition?.mealsPerDay ?? 3, isHebrew)

  // Daily needs
  const dailyNeeds = useMemo(() => calculateDailyNeeds(profile), [
    profile.age, profile.gender, profile.weightKg, profile.heightCm, profile.workout_days,
  ])

  // Today's food totals
  const todayTotals = useMemo(() => {
    const entries = foodLog.filter(e => e.date === todayStr())
    return {
      kcal:    entries.reduce((s, e) => s + e.kcal,    0),
      protein: entries.reduce((s, e) => s + e.protein, 0),
      carbs:   entries.reduce((s, e) => s + e.carbs,   0),
      fat:     entries.reduce((s, e) => s + e.fat,     0),
    }
  }, [foodLog])

  // Today's burned calories: workout page + cardio page + watch auto-accumulation
  const burnedToday = useMemo(() => {
    const d  = todayStr()
    const wt = profile.weightKg ?? 70
    const wb = getWorkoutProgress()
      .filter(w => w.date === d)
      .reduce((s, w) => s + estimateWorkoutCalories(w.type, w.duration, wt), 0)
    const cb = getCardioProgress()
      .filter(w => w.date === d)
      .reduce((s, w) => s + estimateWorkoutCalories('cardio', w.duration, wt), 0)
    const mb = manualBurnLog.reduce((s, e) => s + e.kcal, 0)
    return wb + cb + mb
  }, [profile.weightKg, manualBurnLog])

  // Round to nearest 10 for display
  const r10 = (n: number) => Math.round(n / 10) * 10

  // Goal-based daily deficit and split between diet & exercise
  // 1 kg fat ≈ 7700 kcal → daily deficit = (kg to lose × 7700) / days
  // Split: 60% from eating less, 40% from exercise
  const { goalAdjustedTarget, goalBurnTarget } = useMemo(() => {
    if (!shredGoal) {
      return { goalAdjustedTarget: dailyNeeds.targetKcal, goalBurnTarget: dailyNeeds.burnGoalKcal }
    }
    const totalToLoseKg = shredGoal.startWeightKg - shredGoal.targetWeightKg
    if (totalToLoseKg <= 0) {
      return { goalAdjustedTarget: dailyNeeds.targetKcal, goalBurnTarget: dailyNeeds.burnGoalKcal }
    }
    const totalDays    = Math.max(1,
      (new Date(shredGoal.targetDate).getTime() - new Date(shredGoal.startDate).getTime()) / 86400_000
    )
    const dailyDeficit = (totalToLoseKg * 7700) / totalDays
    const fromDiet     = dailyDeficit * 0.6   // 60% from eating less
    const fromExercise = dailyDeficit * 0.4   // 40% from burning

    const minKcal = profile.gender === 'female' ? 1200 : 1500
    const eatTarget  = Math.round(Math.max(minKcal, dailyNeeds.tdee - Math.min(fromDiet, 800)) / 10) * 10
    const burnTarget = Math.round(Math.max(150, fromExercise) / 10) * 10

    return { goalAdjustedTarget: eatTarget, goalBurnTarget: burnTarget }
  }, [shredGoal, dailyNeeds.tdee, dailyNeeds.targetKcal, dailyNeeds.burnGoalKcal, profile.gender])

  const remainingKcal = goalAdjustedTarget + burnedToday - todayTotals.kcal

  // Adaptive burn goal: base goal + any overeating goes to exercise
  const overageKcal       = Math.max(0, todayTotals.kcal - goalAdjustedTarget)
  const effectiveBurnGoal = goalBurnTarget + r10(overageKcal)

  // ±100 kcal success window
  const eatSuccess  = todayTotals.kcal >= goalAdjustedTarget - 100 && todayTotals.kcal <= goalAdjustedTarget + 100
  const eatOver     = todayTotals.kcal > goalAdjustedTarget + 100
  const burnBuffer  = Math.min(100, Math.floor(effectiveBurnGoal * 0.5))
  const burnSuccess = burnedToday > 0 && burnedToday >= effectiveBurnGoal - burnBuffer

  // Check goal reached
  const latestWeight = getLatestWeight()
  useEffect(() => {
    if (!shredGoal || !latestWeight) return
    if (latestWeight.weightKg <= shredGoal.targetWeightKg) setShowCelebration(true)
  }, [latestWeight?.weightKg, shredGoal?.targetWeightKg])

  const motivMsg = useMemo(() => {
    if (!shredGoal || !latestWeight) return null
    return getMotivationalMessage(shredGoal, latestWeight.weightKg)
  }, [shredGoal, latestWeight?.weightKg])

  // USDA search — debounced 500ms, with Hebrew query translation + result translation
  const handleFoodQueryChange = useCallback((q: string) => {
    setFoodQuery(q)
    setSelectedFood(null)
    setUsdaResults([])
    setUsdaError('')
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!q.trim()) return
    searchTimerRef.current = setTimeout(async () => {
      setUsdaLoading(true)
      try {
        // If Hebrew mode and Hebrew chars in query → translate query to English first
        const searchQuery = isHebrew ? await translateQueryToEnglish(q.trim()) : q.trim()
        const results = await searchUSDA(searchQuery)
        if (results.length === 0) {
          setUsdaError(isHebrew ? 'לא נמצאו תוצאות' : 'No results found')
          setUsdaLoading(false)
          return
        }
        // Show English results immediately
        setUsdaResults(results)
        setUsdaLoading(false)
        // Then translate descriptions to Hebrew in background
        if (isHebrew) {
          const hebrewNames = await translateFoodNamesToHebrew(results.map(r => r.description))
          setUsdaResults(results.map((r, i) => ({ ...r, description: hebrewNames[i] ?? r.description })))
        }
      } catch {
        setUsdaError(isHebrew ? 'שגיאה בחיפוש — בדוק חיבור' : 'Search error — check connection')
        setUsdaLoading(false)
      }
    }, 500)
  }, [isHebrew])

  // Confirm and add food entry from USDA selection
  const handleAddFood = () => {
    if (!selectedFood) return
    const grams = Math.max(1, parseFloat(foodGrams) || 100)
    const ratio = grams / 100
    addFoodEntry({
      meal:    activeMeal,
      name:    selectedFood.description,
      grams,
      kcal:    Math.round(selectedFood.kcalPer100 * ratio),
      protein: Math.round(selectedFood.proteinPer100 * ratio * 10) / 10,
      carbs:   Math.round(selectedFood.carbsPer100 * ratio * 10) / 10,
      fat:     Math.round(selectedFood.fatPer100 * ratio * 10) / 10,
    })
    setFoodLog(getFoodLog())
    setShowAddFood(false)
    setFoodQuery('')
    setUsdaResults([])
    setSelectedFood(null)
    setFoodGrams('100')
    setUsdaError('')
    emitProgressEvent()
  }

  const closeAddFood = () => {
    setShowAddFood(false)
    setFoodQuery('')
    setUsdaResults([])
    setSelectedFood(null)
    setFoodGrams('100')
    setUsdaError('')
    setAiInput('')
    setAiFoodResult(null)
    setAiFoodError('')
    aiAbortRef.current?.abort()
  }

  const handleAiCalculate = async () => {
    if (!aiInput.trim()) return
    aiAbortRef.current?.abort()
    const ctrl = new AbortController()
    aiAbortRef.current = ctrl
    const timeout = setTimeout(() => ctrl.abort(), 15_000)
    setAiFoodLoading(true)
    setAiFoodResult(null)
    setAiFoodError('')
    try {
      const prompt =
        `Nutrition for: "${aiInput.trim()}". ` +
        `Israeli foods: pita 265kcal/100g, hummus 166, falafel 333, shawarma 230. ` +
        `Use realistic serving sizes (1 egg≈78kcal, 1 potato≈155kcal). Sum all items. ` +
        `Reply ONLY JSON: {"kcal":number,"protein":number,"carbs":number,"fat":number}`
      const reply = await fetchAI(prompt, ctrl.signal)
      const match = reply.text.match(/\{[\s\S]*?\}/)
      if (!match) throw new Error('no json')
      const d = JSON.parse(match[0]) as Record<string, number>
      if (typeof d.kcal !== 'number' || d.kcal < 10) throw new Error('bad')
      setAiFoodResult({ kcal: Math.round(d.kcal), protein: Math.round((d.protein ?? 0) * 10) / 10, carbs: Math.round((d.carbs ?? 0) * 10) / 10, fat: Math.round((d.fat ?? 0) * 10) / 10 })
    } catch {
      if (!ctrl.signal.aborted) setAiFoodError(isHebrew ? 'לא הצלחתי לחשב — נסה תיאור אחר' : 'Could not calculate — try rephrasing')
    } finally {
      clearTimeout(timeout)
      setAiFoodLoading(false)
    }
  }

  const handleAddFoodFromAI = () => {
    if (!aiFoodResult) return
    addFoodEntry({ meal: activeMeal, name: aiInput.trim(), grams: 0, ...aiFoodResult })
    setFoodLog(getFoodLog())
    emitProgressEvent()
    closeAddFood()
  }

  // Add saved meal to slot (prevents re-applying same meal twice)
  const handleAddSavedMealToSlot = (meal: SavedMeal, mealIdx: number) => {
    if (appliedSavedMeals[mealIdx] === meal.id) return // already applied
    meal.items.forEach(item => addFoodEntry({ meal: mealIdx, ...item }))
    setFoodLog(getFoodLog())
    emitProgressEvent()
    setAppliedSavedMeals(prev => ({ ...prev, [mealIdx]: meal.id }))
    setShowSavedMealFor(null)
  }

  // Save weight
  const handleSaveWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 25 || w > 250) return
    addWeightEntry(w)
    setWeightLog(getWeightLog())
    setShowWeightPopup(false)
    if (!shredGoal) setShowGoalForm(true)
    emitProgressEvent()
  }

  // Save goal
  const handleSaveGoal = () => {
    const target = parseFloat(goalWeight)
    if (!target || !goalDate) return
    const latest = getLatestWeight()
    const goal: ShredGoal = {
      targetWeightKg: target,
      targetDate:     goalDate,
      startWeightKg:  latest?.weightKg ?? (profile.weightKg ?? 70),
      startDate:      todayStr(),
    }
    saveShredGoal(goal)
    setShredGoal(goal)
    setShowGoalForm(false)
    emitProgressEvent()
  }


  // AI meal suggestion
  const handleAiSuggestion = async () => {
    setAiLoading(true)
    setAiSuggestion('')
    try {
      const proteinLeft = Math.max(0, dailyNeeds.protein - todayTotals.protein)
      const prompt = [
        `אני בתהליך חיטוב. נשארו לי ${remainingKcal} קלוריות ו-${proteinLeft.toFixed(0)}g חלבון להיום.`,
        `יש לי בבית: ${whatIHave || 'מרכיבים בסיסיים (עוף, ביצים, ירקות, אורז)'}. `,
        `הגדר ארוחה קלה שמתאימה לחיטוב — תן שם + מרכיבים + כמויות בגרמים + ערכים תזונתיים מוערכים.`,
        `תשובה קצרה ומעשית בלבד.`,
      ].join(' ')
      const reply = await fetchAI(prompt)
      setAiSuggestion(reply.text)
    } catch {
      setAiSuggestion(t('Could not reach AI right now.', 'לא הצלחתי להתחבר לAI כרגע.'))
    }
    setAiLoading(false)
  }

  const card = {
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding:      '14px 16px',
  } as const

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <PageHeader title={t('Shredding 🔥', 'חיטוב 🔥')} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([
            ['summary',   t('Summary',   'סיכום יומי')],
            ['nutrition', t('Nutrition', 'תזונה')],
            ['goals',     t('Goals',     'יעדים')],
          ] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background:   tab === key ? '#ef4444' : 'rgba(255,255,255,0.1)',
              border:       'none',
              borderRadius: 10,
              color:        '#fff',
              cursor:       'pointer',
              flex:         1,
              fontSize:     13,
              fontWeight:   800,
              padding:      '9px 4px',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sunday weight popup banner */}
        {showWeightPopup && (
          <div style={{ ...card, border: '1.5px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.07)', marginBottom: 14 }}>
            <strong>⚖️ {t("Sunday check-in — enter your weight!", 'יום ראשון — הכנס את המשקל שלך!')}</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input className="form-input" type="number" step="0.1" min="25" max="250"
                placeholder={t('Weight kg', 'משקל ק"ג')} value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveWeight()}
              />
              <button className="btn-primary" style={{ width: 'auto', paddingInline: 16, background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleSaveWeight}>
                {t('Save', 'שמור')}
              </button>
              <button className="btn-secondary" style={{ marginTop: 0, width: 'auto', paddingInline: 12 }}
                onClick={() => setShowWeightPopup(false)}>
                {t('Later', 'אחר כך')}
              </button>
            </div>
          </div>
        )}

        {/* ══ TAB: SUMMARY ══════════════════════════════════════════════════════ */}
        {tab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Two main goals side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              {/* Calories to CONSUME */}
              <div style={{ ...card, textAlign: 'center', border: '1.5px solid rgba(34,197,94,0.3)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  🍽️ {t('To consume', 'לצרוך')}
                </div>
                <svg width={100} height={100} viewBox="0 0 100 100">
                  <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={9} />
                  <circle cx={50} cy={50} r={40} fill="none"
                    stroke={eatOver ? '#ef4444' : eatSuccess ? '#22c55e' : '#6366f1'}
                    strokeWidth={9}
                    strokeDasharray={`${Math.min(251.2, (todayTotals.kcal / Math.max(1, goalAdjustedTarget)) * 251.2)} 251.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text x={50} y={46} textAnchor="middle" fontSize={18} fontWeight={900} fill="#fff">
                    {r10(todayTotals.kcal)}
                  </text>
                  <text x={50} y={60} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.45)">
                    / {r10(goalAdjustedTarget)}
                  </text>
                </svg>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  {eatSuccess
                    ? <strong style={{ color: '#22c55e' }}>✓ {t('On target!', 'בדיוק בטווח!')}</strong>
                    : eatOver
                    ? <strong style={{ color: '#ef4444' }}>+{r10(overageKcal)} {t('over', 'מעל')}</strong>
                    : <>{t('Remaining', 'נשאר')}: <strong style={{ color: '#6366f1' }}>{r10(remainingKcal)}</strong></>
                  }
                </div>
              </div>

              {/* Calories to BURN */}
              <div style={{ ...card, textAlign: 'center', border: '1.5px solid rgba(239,68,68,0.3)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  🔥 {t('To burn', 'לשרוף')}
                  {isHRConnected() && getCurrentHR() > 50 && (
                    <span style={{ color: '#ef4444', marginInlineStart: 5 }}>⌚ {getCurrentHR()}bpm</span>
                  )}
                </div>
                <svg width={100} height={100} viewBox="0 0 100 100">
                  <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={9} />
                  <circle cx={50} cy={50} r={40} fill="none"
                    stroke={burnSuccess ? '#22c55e' : '#ef4444'}
                    strokeWidth={9}
                    strokeDasharray={`${Math.min(251.2, (burnedToday / Math.max(1, effectiveBurnGoal)) * 251.2)} 251.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text x={50} y={46} textAnchor="middle" fontSize={18} fontWeight={900} fill="#fff">
                    {r10(burnedToday)}
                  </text>
                  <text x={50} y={60} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.45)">
                    / {r10(effectiveBurnGoal)}
                  </text>
                </svg>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  {burnSuccess
                    ? <strong style={{ color: '#22c55e' }}>✓ {t('Goal reached!', 'יעד הושג!')}</strong>
                    : <>{t('Left', 'נשאר')}: <strong style={{ color: '#ef4444' }}>{r10(Math.max(0, effectiveBurnGoal - burnedToday))}</strong></>
                  }
                </div>
                {overageKcal > 0 && (
                  <div style={{ fontSize: 10, color: '#f97316', marginTop: 4 }}>
                    ⚠️ {t('incl. overeating', 'כולל עודף אכילה')}
                  </div>
                )}
              </div>
            </div>

            {/* Macros */}
            <div style={card}>
              <strong>{t('Macros', 'מאקרו')}</strong>
              {[
                { label: t('Protein', 'חלבון'),    eaten: todayTotals.protein, goal: dailyNeeds.protein, color: '#ef4444' },
                { label: t('Carbs',   'פחמימות'),  eaten: todayTotals.carbs,   goal: dailyNeeds.carbs,   color: '#f59e0b' },
                { label: t('Fat',     'שומן'),     eaten: todayTotals.fat,     goal: dailyNeeds.fat,     color: '#22c55e' },
              ].map(m => (
                <div key={m.label} style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{m.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {m.eaten.toFixed(0)}g / {m.goal}g
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, height: 7, overflow: 'hidden' }}>
                    <div style={{
                      background:   m.color,
                      borderRadius: 6,
                      height:       '100%',
                      transition:   'width 0.4s',
                      width:        `${Math.min(100, (m.eaten / Math.max(1, m.goal)) * 100)}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* TDEE info */}
            <div style={{ ...card, fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              TDEE: {r10(dailyNeeds.tdee)} kcal · {t('Target', 'יעד')}: {r10(goalAdjustedTarget)} kcal
              {profile.age && profile.age < 18 && (
                <span style={{ color: '#6366f1', display: 'block', marginTop: 4 }}>
                  🌱 {t('Teen mode — no calorie deficit applied', 'מצב נוער — אין גירעון קלורי')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: NUTRITION ════════════════════════════════════════════════════ */}
        {tab === 'nutrition' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Meal sections */}
            {mealLabels.map((label, mealIdx) => {
              const entries  = foodLog.filter(e => e.date === todayStr() && e.meal === mealIdx)
              const mealKcal = entries.reduce((s, e) => s + e.kcal, 0)
              return (
                <div key={mealIdx} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>{label}</strong>
                    <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 700 }}>{mealKcal} kcal</span>
                  </div>

                  {entries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {entries.map(entry => (
                        <div key={entry.id} style={{ alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 9, display: 'flex', justifyContent: 'space-between', padding: '7px 10px' }}>
                          <div>
                            <span style={{ fontSize: 13 }}>{entry.name}</span>
                            <small style={{ color: 'rgba(255,255,255,0.42)', display: 'block', fontSize: 11, marginTop: 1 }}>
                              {entry.grams > 0 ? `${entry.grams}g · ` : ''}{entry.kcal} kcal · {entry.protein.toFixed(0)}P · {entry.carbs.toFixed(0)}C · {entry.fat.toFixed(0)}F
                            </small>
                          </div>
                          <button onClick={() => { removeFoodEntry(entry.id); setFoodLog(getFoodLog()) }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ marginTop: 0, fontSize: 12, padding: '8px 12px', width: 'auto' }}
                      onClick={() => { setActiveMeal(mealIdx); setShowAddFood(true) }}>
                      + {t('Add food', 'הוסף מזון')}
                    </button>

                    {/* Load saved meal into this slot */}
                    {savedMeals.length > 0 && !appliedSavedMeals[mealIdx] && (
                      <button className="btn-secondary" style={{ marginTop: 0, fontSize: 12, padding: '8px 12px', width: 'auto', color: '#f59e0b' }}
                        onClick={() => setShowSavedMealFor(showSavedMealFor === mealIdx ? null : mealIdx)}>
                        ⭐ {t('Load saved meal', 'טען ארוחה שמורה')}
                      </button>
                    )}
                    {appliedSavedMeals[mealIdx] && (
                      <span style={{ fontSize: 11, color: '#f59e0b', alignSelf: 'center' }}>
                        ⭐ {savedMeals.find(m => m.id === appliedSavedMeals[mealIdx])?.label ?? t('Saved meal', 'ארוחה שמורה')} {t('loaded', 'נטענה')}
                      </span>
                    )}

                    {/* Save meal as favorite */}
                    {entries.length > 0 && savedMeals.length < 3 && (
                      <button className="btn-secondary" style={{ marginTop: 0, fontSize: 12, padding: '8px 12px', width: 'auto', color: 'rgba(255,255,255,0.5)' }}
                        onClick={() => {
                          const name = window.prompt(isHebrew ? 'שם לארוחה המועדפת:' : 'Name for saved meal:') ?? label
                          if (!name.trim()) return
                          saveMeal({
                            label:        name.trim(),
                            totalKcal:    entries.reduce((s, e) => s + e.kcal,    0),
                            totalProtein: entries.reduce((s, e) => s + e.protein, 0),
                            totalCarbs:   entries.reduce((s, e) => s + e.carbs,   0),
                            totalFat:     entries.reduce((s, e) => s + e.fat,     0),
                            items:        entries.map(e => ({ name: e.name, grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat })),
                          })
                          setSavedMeals(getSavedMeals())
                        }}>
                        💾 {t('Save', 'שמור')}
                      </button>
                    )}
                  </div>

                  {/* Saved meal picker */}
                  {showSavedMealFor === mealIdx && (
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, marginTop: 10, padding: 10 }}>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '0 0 8px' }}>
                        {t('Choose a saved meal to load:', 'בחר ארוחה שמורה לטעינה:')}
                      </p>
                      {savedMeals.map(meal => (
                        <button key={meal.id}
                          onClick={() => handleAddSavedMealToSlot(meal, mealIdx)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', cursor: 'pointer', display: 'block', marginBottom: 6, padding: '9px 12px', textAlign: 'start', width: '100%' }}>
                          <strong style={{ fontSize: 13 }}>⭐ {meal.label}</strong>
                          <small style={{ color: 'rgba(255,255,255,0.45)', display: 'block', marginTop: 2, fontSize: 11 }}>
                            {meal.totalKcal} kcal · {meal.totalProtein.toFixed(0)}g {t('protein', 'חלבון')}
                          </small>
                        </button>
                      ))}
                      <button className="btn-secondary" style={{ marginTop: 4, fontSize: 11, padding: '6px 10px', width: 'auto' }}
                        onClick={() => setShowSavedMealFor(null)}>
                        {t('Cancel', 'ביטול')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Saved meals management (delete only — loading is done per slot above) */}
            {savedMeals.length > 0 && (
              <div style={{ ...card, border: '1px solid rgba(245,158,11,0.2)' }}>
                <strong>⭐ {t('Saved meals', 'ארוחות מועדפות')} <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>({savedMeals.length}/3)</span></strong>
                {savedMeals.map(meal => (
                  <div key={meal.id} style={{ alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 10, display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8, padding: '8px 12px' }}>
                    <div>
                      <strong style={{ fontSize: 13 }}>⭐ {meal.label}</strong>
                      <small style={{ color: 'rgba(255,255,255,0.45)', display: 'block', fontSize: 11, marginTop: 1 }}>
                        {meal.totalKcal} kcal · {meal.totalProtein.toFixed(0)}g {t('protein', 'חלבון')}
                      </small>
                    </div>
                    <button className="btn-secondary" style={{ marginTop: 0, padding: '5px 10px', fontSize: 12, width: 'auto', color: '#ef4444' }}
                      onClick={() => { deleteSavedMeal(meal.id); setSavedMeals(getSavedMeals()) }}>
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* AI meal suggestion */}
            <div style={{ ...card, border: '1.5px solid rgba(99,102,241,0.3)' }}>
              <strong>🤖 {t('AI meal suggestion', 'הצעת ארוחה מ-AI')}</strong>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '5px 0 10px' }}>
                {remainingKcal > 0
                  ? t(`${r10(remainingKcal)} kcal remaining today`, `נשארו ${r10(remainingKcal)} קלוריות להיום`)
                  : t('Daily calorie goal reached!', 'הגעת ליעד הקלוריות היומי!')}
              </p>
              <input className="form-input"
                placeholder={t('What do you have at home? (chicken, rice, eggs...)', 'מה יש לך בבית? (עוף, אורז, ביצים...)')}
                value={whatIHave}
                onChange={e => setWhatIHave(e.target.value)}
              />
              <button className="btn-primary" style={{ marginTop: 8, background: '#6366f1', borderColor: '#6366f1' }}
                onClick={handleAiSuggestion} disabled={aiLoading}>
                {aiLoading ? '...' : t('Suggest a meal', 'הצע ארוחה')}
              </button>
              {aiSuggestion && (
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, fontSize: 13, lineHeight: 1.65, marginTop: 10, padding: 12, whiteSpace: 'pre-wrap' }}>
                  {aiSuggestion}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: GOALS ════════════════════════════════════════════════════════ */}
        {tab === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Celebration */}
            {showCelebration && (
              <div style={{ ...card, background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.4)', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 4 }}>🎉</div>
                <strong style={{ color: '#22c55e', fontSize: 20 }}>{t('Goal reached!', 'הגעת ליעד!')}</strong>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '8px 0 12px' }}>
                  {t('Incredible achievement! You hit your target weight.', 'הישג מדהים! הגעת למשקל היעד שלך.')}
                </p>
                <button className="btn-primary" style={{ background: '#22c55e', borderColor: '#22c55e' }}
                  onClick={() => { setShowCelebration(false); setShowGoalForm(true) }}>
                  {t('Set a new goal', 'הגדר יעד חדש')}
                </button>
              </div>
            )}

            {/* Current weight card */}
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{t('Current weight', 'משקל נוכחי')}</div>
              <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1 }}>
                {latestWeight?.weightKg.toFixed(1) ?? profile.weightKg?.toFixed(1) ?? '—'}
                <span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}> ק"ג</span>
              </div>
              {shredGoal && (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 }}>
                  {t('Goal', 'יעד')}: {shredGoal.targetWeightKg} ק"ג ·{' '}
                  {Math.max(0, Math.ceil((new Date(shredGoal.targetDate).getTime() - Date.now()) / 86400_000))} {t('days left', 'ימים נותרו')}
                </div>
              )}
              <button className="btn-secondary" style={{ marginTop: 10, fontSize: 12, padding: '7px 14px', width: 'auto' }}
                onClick={() => setShowWeightPopup(true)}>
                ⚖️ {t('Update weight', 'עדכן משקל')}
              </button>
            </div>

            {/* Motivational message */}
            {motivMsg && (
              <div style={{ ...card, textAlign: 'center', padding: '10px 16px' }}>
                <span style={{ color: motivMsg.color, fontSize: 15, fontWeight: 700 }}>{motivMsg.msg}</span>
              </div>
            )}

            {/* Weight chart */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong>{t('Weight trend', 'מגמת משקל')}</strong>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                  <span style={{ color: '#22c55e' }}>▼ {t('down', 'ירידה')}</span>
                  <span style={{ color: '#ef4444' }}>▲ {t('up', 'עלייה')}</span>
                  {shredGoal && <span style={{ color: 'rgba(99,102,241,0.9)' }}>-- {t('goal', 'יעד')}</span>}
                </div>
              </div>
              <WeightChart entries={weightLog} goal={shredGoal} />
            </div>

            {/* Goal form */}
            {(!shredGoal || showGoalForm) && (
              <div style={{ ...card, border: '1.5px solid rgba(239,68,68,0.3)' }}>
                <strong>🎯 {t('Set your goal', 'הגדר יעד חיטוב')}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  <div className="form-group">
                    <label className="form-label">{t('Target weight (kg)', 'משקל יעד (ק"ג)')}</label>
                    <input className="form-input" type="number" step="0.1" min="25" max="250"
                      placeholder="70" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('Target date', 'תאריך יעד')}</label>
                    <input className="form-input" type="date" min={todayStr()}
                      value={goalDate} onChange={e => setGoalDate(e.target.value)} />
                  </div>
                </div>
                <button className="btn-primary" style={{ marginTop: 8, background: '#ef4444', borderColor: '#ef4444' }}
                  onClick={handleSaveGoal} disabled={!goalWeight || !goalDate}>
                  {t('Save goal', 'שמור יעד')}
                </button>
                {shredGoal && (
                  <button className="btn-secondary" style={{ marginTop: 0 }} onClick={() => setShowGoalForm(false)}>
                    {t('Cancel', 'ביטול')}
                  </button>
                )}
              </div>
            )}

            {shredGoal && !showGoalForm && (
              <button className="btn-secondary" onClick={() => setShowGoalForm(true)}>
                ✏️ {t('Edit goal', 'ערוך יעד')}
              </button>
            )}
          </div>
        )}

        {/* ══ ADD FOOD MODAL (USDA) ══════════════════════════════════════════ */}
        {showAddFood && (
          <div style={{ alignItems: 'flex-end', background: 'rgba(0,0,0,0.78)', display: 'flex', inset: 0, position: 'fixed', zIndex: 200 }}
            onClick={closeAddFood}>
            <div style={{ background: '#171725', borderRadius: '20px 20px 0 0', maxHeight: '88vh', overflowY: 'auto', padding: 20, width: '100%' }}
              onClick={e => e.stopPropagation()}>

              <h3 style={{ margin: '0 0 12px' }}>
                {t('Add food', 'הוסף מזון')} — {mealLabels[activeMeal]}
              </h3>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {([['usda', '🔍 USDA'], ['ai', '🤖 ' + t('Describe meal', 'תאר ארוחה')]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setAddFoodTab(key)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    background: addFoodTab === key ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}>{label}</button>
                ))}
              </div>

              {/* ── USDA tab ── */}
              {addFoodTab === 'usda' && <>
              <input className="form-input"
                placeholder={t('Search food (e.g. chicken breast)', 'חפש מזון (למשל: chicken breast)')}
                value={foodQuery}
                onChange={e => handleFoodQueryChange(e.target.value)}
                autoFocus
              />

              {/* Loading */}
              {usdaLoading && (
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '8px 0' }}>⏳ {t('Searching...', 'מחפש...')}</p>
              )}

              {/* Error */}
              {usdaError && !usdaLoading && (
                <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0' }}>{usdaError}</p>
              )}

              {/* Results list */}
              {!selectedFood && usdaResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {usdaResults.map(item => (
                    <button key={item.fdcId}
                      onClick={() => { setSelectedFood(item); setFoodGrams('100') }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', cursor: 'pointer', padding: '10px 12px', textAlign: 'start' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.description}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                        {item.kcalPer100} kcal · {item.proteinPer100}g {t('protein', 'חלבון')} · {item.carbsPer100}g {t('carbs', 'פחמימות')} · {item.fatPer100}g {t('fat', 'שומן')} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ 100g</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected food — grams input + calculated result */}
              {selectedFood && (() => {
                const grams = Math.max(1, parseFloat(foodGrams) || 100)
                const ratio = grams / 100
                const kcal    = Math.round(selectedFood.kcalPer100 * ratio)
                const protein = Math.round(selectedFood.proteinPer100 * ratio * 10) / 10
                const carbs   = Math.round(selectedFood.carbsPer100 * ratio * 10) / 10
                const fat     = Math.round(selectedFood.fatPer100 * ratio * 10) / 10
                return (
                  <div style={{ background: 'rgba(34,197,94,0.07)', border: '1.5px solid rgba(34,197,94,0.3)', borderRadius: 14, marginTop: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, flex: 1, paddingInlineEnd: 8 }}>{selectedFood.description}</p>
                      <button onClick={() => setSelectedFood(null)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{t('Grams:', 'גרמים:')}</label>
                      <input type="number" min="1" max="2000"
                        value={foodGrams}
                        onChange={e => setFoodGrams(e.target.value)}
                        style={{ width: 80, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '7px 10px', fontSize: 15 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14, textAlign: 'center' }}>
                      {[
                        { label: t('Calories', 'קלוריות'), value: kcal,    unit: 'kcal', color: '#22c55e' },
                        { label: t('Protein',  'חלבון'),   value: protein,  unit: 'g',    color: '#ef4444' },
                        { label: t('Carbs',    'פחמימות'), value: carbs,    unit: 'g',    color: '#f59e0b' },
                        { label: t('Fat',      'שומן'),    value: fat,      unit: 'g',    color: '#6366f1' },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 4px' }}>
                          <div style={{ color: m.color, fontSize: 18, fontWeight: 900 }}>{m.value}</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{m.unit}</div>
                          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    <button className="btn-primary"
                      style={{ background: '#22c55e', borderColor: '#22c55e' }}
                      onClick={handleAddFood}>
                      + {t('Add to meal', 'הוסף לארוחה')}
                    </button>
                  </div>
                )
              })()}

              </>}

              {/* ── AI free-text tab ── */}
              {addFoodTab === 'ai' && (
                <div>
                  <input className="form-input"
                    placeholder={t('e.g. grilled chicken 200g + rice 150g', 'למשל: חזה עוף בגריל 200 גרם + אורז 150 גרם')}
                    value={aiInput}
                    onChange={e => { setAiInput(e.target.value); setAiFoodResult(null); setAiFoodError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleAiCalculate()}
                    autoFocus
                  />
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '5px 0 12px' }}>
                    {t('Describe what you ate with amounts — AI calculates total calories', 'תאר מה אכלת עם כמויות — AI מחשב סה"כ קלוריות')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ background: '#6366f1', borderColor: '#6366f1', flex: 1 }}
                      onClick={handleAiCalculate} disabled={aiFoodLoading || !aiInput.trim()}>
                      {aiFoodLoading ? '⏳ ' + t('Calculating...', 'מחשב...') : '🤖 ' + t('Calculate', 'חשב')}
                    </button>
                    {aiFoodLoading && (
                      <button className="btn-secondary" style={{ marginTop: 0, width: 'auto', paddingInline: 14 }}
                        onClick={() => { aiAbortRef.current?.abort(); setAiFoodLoading(false) }}>✕</button>
                    )}
                  </div>
                  {aiFoodError && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0' }}>{aiFoodError}</p>}
                  {aiFoodResult && (
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.3)', borderRadius: 14, marginTop: 12, padding: 14 }}>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 10px' }}>✅ {aiInput}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14, textAlign: 'center' }}>
                        {[
                          { label: t('Calories', 'קלוריות'), value: aiFoodResult.kcal,    unit: 'kcal', color: '#22c55e' },
                          { label: t('Protein',  'חלבון'),   value: aiFoodResult.protein,  unit: 'g',    color: '#ef4444' },
                          { label: t('Carbs',    'פחמימות'), value: aiFoodResult.carbs,    unit: 'g',    color: '#f59e0b' },
                          { label: t('Fat',      'שומן'),    value: aiFoodResult.fat,      unit: 'g',    color: '#6366f1' },
                        ].map(m => (
                          <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 4px' }}>
                            <div style={{ color: m.color, fontSize: 18, fontWeight: 900 }}>{m.value}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{m.unit}</div>
                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      <button className="btn-primary" style={{ background: '#22c55e', borderColor: '#22c55e' }}
                        onClick={handleAddFoodFromAI}>
                        + {t('Add to meal', 'הוסף לארוחה')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button className="btn-secondary" style={{ marginTop: 10 }} onClick={closeAddFood}>
                {t('Close', 'סגור')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
