import { useState } from 'react'
import { mockMeals, mockMealFromIngredients, MealOption, MealCategory } from '../data/mockNutrition'
import BottomNav from '../components/layout/BottomNav'

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <span className="macro-chip" style={{ borderColor: color }}>
      <span className="macro-chip-label">{label}</span>
      <span className="macro-chip-value" style={{ color }}>{value}{unit}</span>
    </span>
  )
}

function MealCard({ meal, onSave }: { meal: MealOption; onSave: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    onSave(meal.id)
  }

  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <div>
          <h3 className="meal-card-name">{meal.name}</h3>
          <p className="meal-card-desc">{meal.description}</p>
        </div>
        <span className="meal-kcal">{meal.macros.calories} kcal</span>
      </div>
      <div className="macros-row">
        <MacroBar label="Protein" value={meal.macros.protein} unit="g" color="#22c55e" />
        <MacroBar label="Carbs" value={meal.macros.carbs} unit="g" color="#3b82f6" />
        <MacroBar label="Fat" value={meal.macros.fat} unit="g" color="#f59e0b" />
      </div>
      {expanded && (
        <div className="meal-expanded">
          <p className="meal-section-title">Ingredients</p>
          <ul className="meal-ingredients">
            {meal.ingredients.map(ing => <li key={ing}>{ing}</li>)}
          </ul>
          <p className="meal-section-title">Preparation</p>
          <ol className="meal-steps">
            {meal.prepSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
      <div className="meal-card-actions">
        <button className="btn-meal-action" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Hide' : '👁 View'}
        </button>
        <button className={`btn-meal-action${saved ? ' saved' : ''}`} onClick={handleSave} disabled={saved}>
          {saved ? '✅ Saved' : '🔖 Save'}
        </button>
      </div>
    </div>
  )
}

function MealCreator() {
  const [ingredients, setIngredients] = useState('')
  const [result, setResult] = useState<typeof mockMealFromIngredients | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = () => {
    if (!ingredients.trim()) return
    setLoading(true)
    // TODO: replace with real AI API call (src/lib/ai.ts → generateMealFromIngredients)
    setTimeout(() => {
      setResult(mockMealFromIngredients)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="meal-creator">
      <h3 className="meal-creator-title">🍽️ Create Meal from Ingredients</h3>
      <p className="meal-creator-sub">List what you have — we'll build a recipe (AI coming soon)</p>
      <textarea
        className="form-input"
        rows={3}
        placeholder="e.g. eggs, rice, onion, soy sauce, frozen peas…"
        value={ingredients}
        onChange={e => setIngredients(e.target.value)}
      />
      <button className="btn-primary" onClick={handleGenerate} disabled={loading || !ingredients.trim()}>
        {loading ? 'Creating…' : 'Generate Meal'}
      </button>

      {result && (
        <div className="creator-result">
          <h4 className="creator-result-title">{result.name}</h4>
          <div className="macros-row">
            <MacroBar label="Protein" value={result.macros.protein} unit="g" color="#22c55e" />
            <MacroBar label="Carbs" value={result.macros.carbs} unit="g" color="#3b82f6" />
            <MacroBar label="Fat" value={result.macros.fat} unit="g" color="#f59e0b" />
            <MacroBar label="Cal" value={result.macros.calories} unit="" color="#a855f7" />
          </div>
          <p className="meal-section-title">Ingredients</p>
          <ul className="meal-ingredients">
            {result.ingredients.map(i => <li key={i}>{i}</li>)}
          </ul>
          <p className="meal-section-title">Steps</p>
          <ol className="meal-steps">
            {result.prepSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState<MealCategory['id']>('breakfast')
  const [savedMeals, setSavedMeals] = useState<string[]>([])

  const activeMeal = mockMeals.find(m => m.id === activeTab)!

  const handleSave = (id: string) => {
    setSavedMeals(prev => [...prev, id])
    // TODO: persist to Supabase user_saved_meals table
  }

  return (
    <div className="app-layout">
      <div className="page-content">
        <h1 className="page-title">Nutrition 🥗</h1>

        <div className="meal-tabs">
          {mockMeals.map(m => (
            <button
              key={m.id}
              className={`meal-tab-btn${activeTab === m.id ? ' active' : ''}`}
              onClick={() => setActiveTab(m.id)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <div className="meal-options">
          {activeMeal.options.map(meal => (
            <MealCard key={meal.id} meal={meal} onSave={handleSave} />
          ))}
        </div>

        <MealCreator />
      </div>
      <BottomNav />
    </div>
  )
}
