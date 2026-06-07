import { Navigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useMemo, useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { getAgeGuidance, getProfileGoals, useUser } from '../context/UserContext'
import { type MealOption, type MealCategory, type Macros } from '../data/mockNutrition'
import { generateMealFromIngredients } from '../lib/ai'

import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  generateWeeklyNutritionPlan,
  isWeeklyNutritionPlan,
  type WeeklyNutritionPlan,
} from '../mealPlanEngine'
import { saveWeeklyMealPlan } from '../progressStorage'

// Converts a generated weekly plan into browsable meal categories (breakfast/lunch/dinner)
function buildMealCategoriesFromPlan(plan: WeeklyNutritionPlan): MealCategory[] {
  const BREAKFAST = ['ארוחת בוקר', 'Breakfast', 'לפני אימון', 'Pre-workout']
  const LUNCH     = ['ארוחת צהריים', 'Lunch', 'אחרי אימון', 'Post-workout']
  const DINNER    = ['ארוחת ערב', 'Dinner']

  const breakfastOptions: MealOption[] = []
  const lunchOptions: MealOption[] = []
  const dinnerOptions: MealOption[] = []
  const seen = new Set<string>()

  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (seen.has(meal.name)) continue
      seen.add(meal.name)

      const n = meal.ingredients.length
      const option: MealOption = {
        id: `plan-${meal.name.toLowerCase().replace(/[^a-z0-9א-ת]/g, '-').slice(0, 40)}`,
        name: meal.name,
        nameEn: meal.name,
        description: meal.description,
        macros: {
          calories: 160 + n * 55,
          protein:  8  + n * 4,
          carbs:    18 + n * 6,
          fat:      5  + n * 2,
        },
        ingredients: meal.ingredients,
        prepSteps: [meal.goalFit],
      }

      if (BREAKFAST.some(s => meal.slot.includes(s)))      breakfastOptions.push(option)
      else if (LUNCH.some(s => meal.slot.includes(s)))     lunchOptions.push(option)
      else if (DINNER.some(s => meal.slot.includes(s)))    dinnerOptions.push(option)
      else                                                  lunchOptions.push(option) // snacks → lunch tab
    }
  }

  return [
    { id: 'breakfast' as const, label: 'בוקר',    labelEn: 'Breakfast', emoji: '🌅', options: breakfastOptions },
    { id: 'lunch'     as const, label: 'צהריים',  labelEn: 'Lunch',     emoji: '☀️', options: lunchOptions    },
    { id: 'dinner'    as const, label: 'ערב',     labelEn: 'Dinner',    emoji: '🌙', options: dinnerOptions   },
  ].filter(cat => cat.options.length > 0)
}

interface GeneratedMeal {
  name: string
  description: string
  ingredients: string[]
  macros: Macros
  prepSteps: string[]
  prepTimeMinutes: number
  healthNote: string
  /** True when macros are estimated from a formula, not from AI */
  isEstimate?: boolean
}

function adjustNutritionValue(value: number, multiplier: number) {
  return Math.max(1, Math.round(value * multiplier))
}

function parseIngredientList(value: string) {
  return value
    .split(/[,\n]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex(candidate => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 12)
}

function createGeneratedMeal(ingredientText: string, t: (key: string) => string): GeneratedMeal | null {
  const ingredientList = parseIngredientList(ingredientText)
  if (ingredientList.length === 0) return null

  const primaryIngredients = ingredientList.slice(0, 3).join(', ')
  const ingredientCount = ingredientList.length

  return {
    name: `${t('generatedMealName')}: ${primaryIngredients}`,
    description: t('generatedMealDesc'),
    ingredients: ingredientList,
    macros: {
      calories: 160 + ingredientCount * 55,
      protein: 8 + ingredientCount * 4,
      carbs: 18 + ingredientCount * 6,
      fat: 5 + ingredientCount * 2,
    },
    prepSteps: [
      `${t('generatedMealStepCheck')}: ${ingredientList.join(', ')}.`,
      t('generatedMealStepPrep'),
      t('generatedMealStepCook'),
      t('generatedMealStepServe'),
    ],
    prepTimeMinutes: Math.min(30, 8 + ingredientCount * 3),
    healthNote: t('generatedMealHealthNote'),
  }
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <span className="macro-chip" style={{ borderColor: color }}>
      <span className="macro-chip-label">{label}</span>
      <span className="macro-chip-value" style={{ color }}>{value}{unit}</span>
    </span>
  )
}

function MealCard({
  meal,
  saved,
  onSave,
  portionMultiplier,
}: {
  meal: MealOption
  saved: boolean
  onSave: (id: string) => void
  portionMultiplier: number
}) {
  const { t, language } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const macros = {
    calories: adjustNutritionValue(meal.macros.calories, portionMultiplier),
    protein: adjustNutritionValue(meal.macros.protein, portionMultiplier),
    carbs: adjustNutritionValue(meal.macros.carbs, portionMultiplier),
    fat: adjustNutritionValue(meal.macros.fat, portionMultiplier),
  }
  const mealName = language === 'he' ? meal.name : meal.nameEn

  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <div>
          <h3 className="meal-card-name">{mealName}</h3>
          <p className="meal-card-desc">{meal.description}</p>
        </div>
        <span className="meal-kcal">{macros.calories} {t('kcal')}</span>
      </div>
      <p className="meal-portion-note">{t('portionScale')}: x{portionMultiplier.toFixed(2)}</p>
      <div className="macros-row">
        <MacroBar label={t('protein')} value={macros.protein} unit="g" color="#22c55e" />
        <MacroBar label={t('carbs')} value={macros.carbs} unit="g" color="#3b82f6" />
        <MacroBar label={t('fat')} value={macros.fat} unit="g" color="#f59e0b" />
      </div>
      {expanded && (
        <div className="meal-expanded">
          <p className="meal-section-title">{t('ingredients')}</p>
          <ul className="meal-ingredients">
            {meal.ingredients.map((ingredient, index) => <li key={`${meal.id}-ingredient-${ingredient}-${index}`}>{ingredient}</li>)}
          </ul>
          <p className="meal-section-title">{t('preparation')}</p>
          <ol className="meal-steps">
            {meal.prepSteps.map((step, index) => <li key={`${meal.id}-step-${index}-${step}`}>{step}</li>)}
          </ol>
        </div>
      )}
      <div className="meal-card-actions">
        <button className="btn-meal-action" onClick={() => setExpanded(isExpanded => !isExpanded)}>
          {expanded ? t('hide') : t('view')}
        </button>
        <button className={`btn-meal-action${saved ? ' saved' : ''}`} onClick={() => onSave(meal.id)} disabled={saved}>
          {saved ? t('saved') : t('save')}
        </button>
      </div>
    </div>
  )
}

function MealCreator({ portionMultiplier }: { portionMultiplier: number }) {
  const { t, isHebrew } = useI18n()
  const [ingredients, setIngredients] = useState('')
  const [result, setResult] = useState<GeneratedMeal | null>(null)
  const [loading, setLoading] = useState(false)
  const resultMacros = result ? {
    calories: adjustNutritionValue(result.macros.calories, portionMultiplier),
    protein: adjustNutritionValue(result.macros.protein, portionMultiplier),
    carbs: adjustNutritionValue(result.macros.carbs, portionMultiplier),
    fat: adjustNutritionValue(result.macros.fat, portionMultiplier),
  } : null

  const handleGenerate = async () => {
    if (!ingredients.trim()) return
    setLoading(true)

    // Show formula-based estimate immediately so the user sees something
    const formulaResult = createGeneratedMeal(ingredients, t)
    if (formulaResult) setResult({ ...formulaResult, isEstimate: true })

    try {
      const ingredientList = parseIngredientList(ingredients)
      const aiReply = await generateMealFromIngredients(ingredientList)
      const replyText = (aiReply as { text?: string }).text?.trim()
      if (replyText && formulaResult) {
        // Use AI text as the description; keep formula macros tagged as estimate
        setResult({ ...formulaResult, description: replyText.slice(0, 350), isEstimate: true })
      }
    } catch {
      // Formula fallback remains visible; no extra action needed
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="meal-creator">
      <h3 className="meal-creator-title">{t('createMeal')}</h3>
      <p className="meal-creator-sub">{t('createMealSub')}</p>
      <textarea
        className="form-input"
        rows={3}
        placeholder={isHebrew ? 'ביצים, עגבניות, טונה, יוגורט' : 'eggs, rice, onion, soy sauce'}
        value={ingredients}
        onChange={event => setIngredients(event.target.value)}
        maxLength={300}
      />
      <button className="btn-primary" onClick={handleGenerate} disabled={loading || !ingredients.trim()}>
        {loading ? t('creating') : t('generateMeal')}
      </button>

      {result && (
        <div className="creator-result">
          <h4 className="creator-result-title">{result.name}</h4>
          <p className="meal-card-desc">{result.description}</p>
          <p className="meal-portion-note">{t('portionScale')}: x{portionMultiplier.toFixed(2)}</p>
          {result.isEstimate && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '2px 0 6px', fontStyle: 'italic' }}>
              {isHebrew ? '⚠️ הערכה בלבד — ערכים תזונתיים משוערים' : '⚠️ Estimate only — approximate nutritional values'}
            </p>
          )}
          <div className="macros-row">
            <MacroBar label={t('protein')} value={resultMacros?.protein ?? result.macros.protein} unit="g" color="#22c55e" />
            <MacroBar label={t('carbs')} value={resultMacros?.carbs ?? result.macros.carbs} unit="g" color="#3b82f6" />
            <MacroBar label={t('fat')} value={resultMacros?.fat ?? result.macros.fat} unit="g" color="#f59e0b" />
            <MacroBar label={t('calories')} value={resultMacros?.calories ?? result.macros.calories} unit="" color="#a855f7" />
          </div>
          <p className="meal-section-title">{t('ingredients')}</p>
          <ul className="meal-ingredients">
            {result.ingredients.map((ingredient, index) => <li key={`generated-ingredient-${ingredient}-${index}`}>{ingredient}</li>)}
          </ul>
          <p className="meal-section-title">{t('prepTime')}</p>
          <p className="meal-card-desc">{result.prepTimeMinutes} {t('minutes')}</p>
          <p className="meal-section-title">{t('steps')}</p>
          <ol className="meal-steps">
            {result.prepSteps.map((step, index) => <li key={`generated-step-${index}-${step}`}>{step}</li>)}
          </ol>
          <p className="meal-section-title">{t('healthNote')}</p>
          <p className="meal-card-desc">{result.healthNote}</p>
        </div>
      )}
    </div>
  )
}

function WeeklyMealPlanSection() {
  const { language } = useI18n()
  const { profile } = useUser()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useLocalStorage<WeeklyNutritionPlan | null>(
    'smartfit_weekly_nutrition_plan',
    null,
    (value): value is WeeklyNutritionPlan | null => value === null || isWeeklyNutritionPlan(value),
  )

  const handleGenerate = () => {
    setLoading(true)
    window.setTimeout(() => {
      const nextPlan = generateWeeklyNutritionPlan(profile, language)
      setPlan(nextPlan)
      saveWeeklyMealPlan(nextPlan)
      setLoading(false)
    }, 500)
  }
  const visiblePlan = plan?.language === language ? plan : null

  return (
    <div className="meal-creator" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <h3 className="meal-creator-title">{language === 'he' ? 'תוכנית תזונה שבועית' : 'Weekly Nutrition Plan'}</h3>
      <p className="meal-creator-sub">
        {language === 'he'
          ? 'תוכנית מקומית לפי הפרופיל, ההעדפות והרגישויות ששמרת.'
          : 'A local plan based on your saved profile, preferences and sensitivities.'}
      </p>
      <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading
          ? language === 'he' ? 'בונה תוכנית...' : 'Building plan...'
          : language === 'he' ? 'צור תוכנית שבועית' : 'Generate Weekly Plan'}
      </button>

      {visiblePlan && (
        <div className="creator-result">
          <h4 className="creator-result-title">
            {language === 'he' ? 'תוכנית מותאמת' : 'Personalized plan'}: {visiblePlan.goalLabel}
          </h4>
          <p className="meal-section-title">{language === 'he' ? 'המלצת שתייה יומית' : 'Daily hydration recommendation'}</p>
          <p className="meal-card-desc">{visiblePlan.dailyHydration}</p>

          {visiblePlan.days.map((day, dayIndex) => (
            <div key={`weekly-day-${day.day}-${dayIndex}`} className="meal-expanded">
              <p className="meal-section-title">{language === 'he' ? `יום ${day.day}` : day.day}</p>
              <ul className="meal-ingredients">
                {day.meals.map((meal, mealIndex) => (
                  <li key={`${day.day}-${meal.slot}-${meal.name}-${mealIndex}`}>
                    <strong>{meal.slot}: {meal.name}</strong>
                    <br />
                    {language === 'he' ? 'מצרכים' : 'Ingredients'}: {meal.ingredients.join(', ')}
                    <br />
                    {meal.description}
                    <br />
                    {language === 'he' ? 'למה זה מתאים' : 'Why it fits'}: {meal.goalFit}
                  </li>
                ))}
              </ul>
              <p className="meal-section-title">{language === 'he' ? 'חלופות' : 'Alternatives'}</p>
              <ul className="meal-ingredients">
                {day.alternatives.map((alternative, alternativeIndex) => (
                  <li key={`${day.day}-alternative-${alternativeIndex}-${alternative}`}>{alternative}</li>
                ))}
              </ul>
            </div>
          ))}

          <p className="meal-section-title">{language === 'he' ? 'נשנושים בריאים' : 'Healthy snacks'}</p>
          <ul className="meal-ingredients">
            {visiblePlan.healthySnacks.map((snack, snackIndex) => (
              <li key={`healthy-snack-${snackIndex}-${snack}`}>{snack}</li>
            ))}
          </ul>
          <p className="meal-section-title">{language === 'he' ? 'הערות בטיחות' : 'Safety notes'}</p>
          <ul className="meal-ingredients">
            {visiblePlan.notes.map((note, noteIndex) => (
              <li key={`nutrition-note-${noteIndex}-${note}`}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const WATER_GOAL = 8
const WATER_KEY = 'smartfit_water_log'

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getWaterToday(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(WATER_KEY) ?? 'null')
    if (raw && typeof raw === 'object' && raw.date === getTodayStr() && typeof raw.count === 'number') {
      return raw.count
    }
  } catch {}
  return 0
}

function setWaterToday(count: number) {
  try { localStorage.setItem(WATER_KEY, JSON.stringify({ date: getTodayStr(), count })) } catch {}
}

function WaterWidget({ isHebrew }: { isHebrew: boolean }) {
  const [cups, setCups] = useState(getWaterToday)
  const done = cups >= WATER_GOAL

  const add = () => {
    const next = Math.min(cups + 1, WATER_GOAL + 4)
    setCups(next)
    setWaterToday(next)
  }

  return (
    <div style={{
      background: 'rgba(99,102,241,0.12)',
      borderRadius: 16,
      padding: '12px 14px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      border: done ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
    }}>
      <span style={{ fontSize: 26 }}>{done ? '✅' : '💧'}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
          {done
            ? (isHebrew ? '🎉 שתית מספיק מים היום!' : '🎉 You hit your water goal!')
            : (isHebrew ? `מעקב מים: ${cups}/${WATER_GOAL} כוסות` : `Water: ${cups}/${WATER_GOAL} cups`)}
        </p>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {Array.from({ length: WATER_GOAL }).map((_, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: i < cups ? '#6366f1' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
      </div>
      {!done && (
        <button
          onClick={add}
          style={{ background: '#6366f1', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 20, width: 36, height: 36, cursor: 'pointer' }}
        >
          +
        </button>
      )}
    </div>
  )
}

export default function NutritionPage() {
  const { t, language } = useI18n()
  const { profile } = useUser()
  const ageGuidance = getAgeGuidance(profile)
  const hasCuttingGoal = getProfileGoals(profile).includes('cut')
  const [activeTab, setActiveTab] = useState<MealCategory['id']>('breakfast')
  const [savedMeals, setSavedMeals] = useLocalStorage<string[]>('smartfit_saved_meals', [], value =>
    Array.isArray(value) && value.every(item => typeof item === 'string'),
  )

  // Build meal categories — use saved plan from localStorage first, generate only as fallback
  const mealCategories = useMemo(() => {
    try {
      const raw = localStorage.getItem('smartfit_weekly_nutrition_plan')
      const stored = raw ? (JSON.parse(raw) as WeeklyNutritionPlan | null) : null
      const savedPlan = (stored && isWeeklyNutritionPlan(stored)) ? stored : generateWeeklyNutritionPlan(profile, language === 'he' ? 'he' : 'en')
      return buildMealCategoriesFromPlan(savedPlan)
    } catch {
      return buildMealCategoriesFromPlan(generateWeeklyNutritionPlan(profile, language === 'he' ? 'he' : 'en'))
    }
  }, [profile, language])

  if (hasCuttingGoal) return <Navigate to="/shredding" replace />

  const activeMeal = mealCategories.find(meal => meal.id === activeTab) ?? mealCategories[0]

  const handleSave = (id: string) => {
    setSavedMeals(prev => (prev.includes(id) ? prev : [...prev, id]))
  }

  return (
    <div className="app-layout">
      <PageHeader title={t('nutritionTitle')} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        <WaterWidget isHebrew={language === 'he'} />

        <div className="age-note">
          <strong>{t('ageAdaptation')}: {t(ageGuidance.group)}</strong>
          <span>{t('ageNutritionNote')}</span>
        </div>

        <div className="meal-tabs">
          {mealCategories.map((meal, index) => (
            <button
              key={`meal-tab-${meal.id}-${index}`}
              className={`meal-tab-btn${activeTab === meal.id ? ' active' : ''}`}
              onClick={() => setActiveTab(meal.id as MealCategory['id'])}
            >
              {t(meal.id)}
            </button>
          ))}
        </div>

        {activeMeal ? (
          <div className="meal-options">
            {activeMeal.options.map((meal, index) => (
              <MealCard
                key={`${activeMeal.id}-${meal.id}-${index}`}
                meal={meal}
                saved={savedMeals.includes(meal.id)}
                onSave={handleSave}
                portionMultiplier={ageGuidance.nutritionMultiplier}
              />
            ))}
          </div>
        ) : (
          <p className="insight-text">{t('noMeals')}</p>
        )}

        <MealCreator portionMultiplier={ageGuidance.nutritionMultiplier} />
        <WeeklyMealPlanSection />
      </div>
    </div>
  )
}
