import PageHeader from '../components/layout/PageHeader'
import { useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { useUser } from '../context/UserContext'

import { RECIPES, CATEGORY_LABELS, type RecipeCategory, type Recipe } from '../data/recipes'

const ALL_CATEGORIES: RecipeCategory[] = ['breakfast', 'lunch', 'dinner', 'snack', 'post-workout']

function MacroPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ background: color, borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#fff' }}>
      {label}: {value}
    </span>
  )
}

function RecipeCard({ recipe, isHebrew, onOpen }: { recipe: Recipe; isHebrew: boolean; onOpen: (r: Recipe) => void }) {
  const name = isHebrew ? recipe.nameHe : recipe.nameEn
  const desc = isHebrew ? recipe.descHe : recipe.descEn
  const catLabel = CATEGORY_LABELS[recipe.category]
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
      onClick={() => onOpen(recipe)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(recipe) }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600 }}>
          {isHebrew ? catLabel.he : catLabel.en}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          ⏱ {recipe.prepMinutes} {isHebrew ? 'דק׳' : 'min'}
        </span>
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>{name}</h3>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{desc}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <MacroPill label="kcal" value={String(recipe.calories)} color="rgba(168,85,247,0.5)" />
        <MacroPill label="P" value={`${recipe.protein}g`} color="rgba(59,130,246,0.5)" />
        <MacroPill label="C" value={`${recipe.carbs}g`} color="rgba(234,179,8,0.5)" />
        <MacroPill label="F" value={`${recipe.fat}g`} color="rgba(239,68,68,0.4)" />
      </div>
    </div>
  )
}

function RecipeModal({ recipe, isHebrew, onClose }: { recipe: Recipe; isHebrew: boolean; onClose: () => void }) {
  const name = isHebrew ? recipe.nameHe : recipe.nameEn
  const ingredients = isHebrew ? recipe.ingredientsHe : recipe.ingredientsEn
  const steps = isHebrew ? recipe.stepsHe : recipe.stepsEn
  const t = (en: string, he: string) => isHebrew ? he : en

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111', borderRadius: '20px 20px 0 0',
          padding: 24, width: '100%', maxWidth: 480,
          maxHeight: '85vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <MacroPill label="kcal" value={String(recipe.calories)} color="rgba(168,85,247,0.6)" />
          <MacroPill label={t('Protein', 'חלבון')} value={`${recipe.protein}g`} color="rgba(59,130,246,0.6)" />
          <MacroPill label={t('Carbs', 'פחמימות')} value={`${recipe.carbs}g`} color="rgba(234,179,8,0.6)" />
          <MacroPill label={t('Fat', 'שומן')} value={`${recipe.fat}g`} color="rgba(239,68,68,0.5)" />
        </div>

        <h3 style={{ fontSize: 14, color: '#a855f7', marginBottom: 8 }}>
          {t('Ingredients', 'מרכיבים')}
        </h3>
        <ul style={{ margin: '0 0 16px', paddingInlineStart: 20 }}>
          {ingredients.map((ing, i) => (
            <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{ing}</li>
          ))}
        </ul>

        <h3 style={{ fontSize: 14, color: '#a855f7', marginBottom: 8 }}>
          {t('Steps', 'שלבים')}
        </h3>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{
              minWidth: 24, height: 24, borderRadius: '50%',
              background: '#a855f7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700,
            }}>
              {i + 1}
            </span>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RecipesPage() {
  const { isHebrew } = useI18n()
  const { profile } = useUser()
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | 'all'>('all')
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null)

  const t = (en: string, he: string) => isHebrew ? he : en

  const filtered = RECIPES.filter(r => {
    if (activeCategory !== 'all' && r.category !== activeCategory) return false
    if (profile.nutritionPref === 'vegan' && !r.tags.includes('vegan')) return false
    if (profile.nutritionPref === 'vegetarian' && !r.tags.includes('vegetarian') && !r.tags.includes('vegan')) return false
    if (profile.nutritionPref === 'gluten-free' && !r.tags.includes('gluten-free')) return false
    return true
  })

  return (
    <div className="app-layout">
      <PageHeader title={`🍽 ${t('Recipe Book', 'ספר מתכונים')}`} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              background: activeCategory === 'all' ? '#a855f7' : 'rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            {t('All', 'הכל')}
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
                background: activeCategory === cat ? '#a855f7' : 'rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            >
              {isHebrew ? CATEGORY_LABELS[cat].he : CATEGORY_LABELS[cat].en}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40 }}>
            {t('No recipes match your filters', 'אין מתכונים שתואמים את הפילטרים שלך')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} isHebrew={isHebrew} onOpen={setOpenRecipe} />
            ))}
          </div>
        )}
      </div>

      {openRecipe && (
        <RecipeModal recipe={openRecipe} isHebrew={isHebrew} onClose={() => setOpenRecipe(null)} />
      )}

    </div>
  )
}
