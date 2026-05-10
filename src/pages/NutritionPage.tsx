import { useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { getAgeGuidance, useUser } from '../context/UserContext'
import { mockMeals, MealOption, MealCategory, Macros } from '../data/mockNutrition'
import BottomNav from '../components/layout/BottomNav'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  generateWeeklyNutritionPlan,
  isWeeklyNutritionPlan,
  type WeeklyNutritionPlan,
} from '../mealPlanEngine'
import { saveWeeklyMealPlan } from '../progressStorage'

interface GeneratedMeal {
  name: string
  description: string
  ingredients: string[]
  macros: Macros
  prepSteps: string[]
  prepTimeMinutes: number
  healthNote: string
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
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const macros = {
    calories: adjustNutritionValue(meal.macros.calories, portionMultiplier),
    protein: adjustNutritionValue(meal.macros.protein, portionMultiplier),
    carbs: adjustNutritionValue(meal.macros.carbs, portionMultiplier),
    fat: adjustNutritionValue(meal.macros.fat, portionMultiplier),
  }

  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <div>
          <h3 className="meal-card-name">{meal.name}</h3>
          <p className="meal-card-desc">{meal.description}</p>
        </div>
        <span className="meal-kcal">{macros.calories} {t('kcal')}</span>
      </div>
      <p className="meal-portion-note">{t('portionScale')}: x{portionMultiplier.toFixed(2)}</p>
      <div className="macros-row">
        <MacroBar label="Protein" value={macros.protein} unit="g" color="#22c55e" />
        <MacroBar label="Carbs" value={macros.carbs} unit="g" color="#3b82f6" />
        <MacroBar label="Fat" value={macros.fat} unit="g" color="#f59e0b" />
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

  const handleGenerate = () => {
    if (!ingredients.trim()) return
    setLoading(true)

    window.setTimeout(() => {
      setResult(createGeneratedMeal(ingredients, t))
      setLoading(false)
    }, 600)
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

export default function NutritionPage() {
  const { t } = useI18n()
  const { profile } = useUser()
  const ageGuidance = getAgeGuidance(profile)
  const [activeTab, setActiveTab] = useState<MealCategory['id']>('breakfast')
  const [savedMeals, setSavedMeals] = useLocalStorage<string[]>('smartfit_saved_meals', [], value =>
    Array.isArray(value) && value.every(item => typeof item === 'string'),
  )

  const activeMeal = mockMeals.find(meal => meal.id === activeTab) ?? mockMeals[0]

  const handleSave = (id: string) => {
    setSavedMeals(prev => (prev.includes(id) ? prev : [...prev, id]))
  }

  return (
    <div className="app-layout">
      <div className="page-content">
        <h1 className="page-title">{t('nutritionTitle')}</h1>

        <div className="age-note">
          <strong>{t('ageAdaptation')}: {t(ageGuidance.group)}</strong>
          <span>{t('ageNutritionNote')}</span>
        </div>

        <div className="meal-tabs">
            {mockMeals.map((meal, index) => (
            <button
              key={`meal-tab-${meal.id}-${index}`}
              className={`meal-tab-btn${activeTab === meal.id ? ' active' : ''}`}
              onClick={() => setActiveTab(meal.id)}
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
      <BottomNav />
    </div>
  )
}
