import PageHeader from '../components/layout/PageHeader'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../context/I18nContext'
import {
  WEEK_DAYS,
  getAgeGuidance,
  getProfileGoals,
  getProfileWeeklyPlan,
  getProfileWorkoutTypes,
  type FitnessLevel,
  type Goal,
  type ScheduleFocus,
  type WeekDay,
  type WeeklyPlan,
  type WorkoutType,
  useUser,
} from '../context/UserContext'


const MIN_REST_DAYS = 0
const MAX_REST_DAYS = 3

const dayLabelKeys: Record<WeekDay, string> = {
  sun: 'sunday',
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
}

const focusLabelKeys: Record<ScheduleFocus, string> = {
  goal: 'goalWorkout',
  abs: 'absWorkout',
  arms: 'armsWorkout',
  legs: 'legsWorkout',
  back: 'backWorkout',
  aerobic: 'aerobicWorkout',
  rest: 'restDay',
  chest: 'chestWorkout',
  glutes: 'glutesWorkout',
}

const goalLabelKeys: Record<Goal, string> = {
  cut: 'toneUp',
  bulk: 'buildMuscle',
  endurance: 'enduranceGoal',
  flexibility: 'flexibilityGoal',
  fitness: 'generalFitness',
  health: 'health',
  consistency: 'consistencyGoal',
}

const locationLabelKeys: Record<WorkoutType, string> = {
  gym: 'gym',
  home: 'home',
  outdoor: 'outdoor',
}

const goalFocusOrder: Record<Goal, ScheduleFocus[]> = {
  cut: ['aerobic', 'legs', 'abs', 'goal'],
  bulk: ['goal', 'chest', 'back', 'legs', 'arms', 'abs'],
  endurance: ['aerobic', 'legs', 'goal', 'abs'],
  flexibility: ['abs', 'goal', 'aerobic', 'legs'],
  fitness: ['goal', 'chest', 'back', 'aerobic', 'legs', 'arms', 'abs'],
  health: ['aerobic', 'goal', 'abs', 'legs'],
  consistency: ['goal', 'aerobic', 'abs', 'legs'],
}

function getRestDays(plan: WeeklyPlan): WeekDay[] {
  return WEEK_DAYS.filter(day => plan[day] === 'rest')
}

function uniqueFocuses(focuses: ScheduleFocus[]): ScheduleFocus[] {
  return focuses.filter((focus, index) => focus !== 'rest' && focuses.indexOf(focus) === index)
}

function getMockAiFocusQueue(goals: Goal[], fitnessLevel: FitnessLevel): ScheduleFocus[] {
  const focusQueue = uniqueFocuses(goals.flatMap(goal => goalFocusOrder[goal]))
  const safeQueue = focusQueue.length > 0 ? focusQueue : goalFocusOrder.fitness

  if (fitnessLevel === 'advanced') return [...safeQueue, 'aerobic', 'goal']
  if (fitnessLevel === 'beginner') return [...safeQueue.filter(focus => focus !== 'legs'), 'legs']
  return safeQueue
}

const LEG_FOCUSES = new Set<ScheduleFocus>(['legs', 'glutes'])

function buildMockAiPlan(restDays: WeekDay[], goals: Goal[], fitnessLevel: FitnessLevel): WeeklyPlan {
  const restSet = new Set(restDays)
  const focusQueue = getMockAiFocusQueue(goals, fitnessLevel)
  const plan = {} as WeeklyPlan
  let focusIndex = 0

  WEEK_DAYS.forEach((day, dayIdx) => {
    if (restSet.has(day)) {
      plan[day] = 'rest'
      return
    }

    let candidate = focusQueue[focusIndex % focusQueue.length]

    // Prevent consecutive leg days
    if (dayIdx > 0 && LEG_FOCUSES.has(candidate)) {
      const prevDay = WEEK_DAYS[dayIdx - 1]
      if (plan[prevDay] && LEG_FOCUSES.has(plan[prevDay] as ScheduleFocus)) {
        // Find next non-leg focus in the queue
        let tries = 0
        while (LEG_FOCUSES.has(candidate) && tries < focusQueue.length) {
          focusIndex += 1
          tries += 1
          candidate = focusQueue[focusIndex % focusQueue.length]
        }
      }
    }

    plan[day] = candidate
    focusIndex += 1
  })

  return plan
}

export default function TrainingPlanPage() {
  const { profile, updateProfile } = useUser()
  const { t, language } = useI18n()
  const isHebrew = language === 'he'

  const currentPlan = getProfileWeeklyPlan(profile)
  const goals = getProfileGoals(profile)
  const locations = getProfileWorkoutTypes(profile)
  const ageGuidance = getAgeGuidance(profile)
  const hasGym = locations.includes('gym')
  const hasHome = locations.includes('home')

  const [selectedRestDays, setSelectedRestDays] = useState<WeekDay[]>(getRestDays(currentPlan))
  const [draftPlan, setDraftPlan] = useState<WeeklyPlan>(currentPlan)
  const [gymDays, setGymDays] = useState<WeekDay[]>(profile.gymDays ?? [])
  const [gymFrequency, setGymFrequency] = useState<number>(
    (profile.gymDays ?? []).length > 0 ? (profile.gymDays ?? []).length : 3
  )
  const [saved, setSaved] = useState(false)
  // Plan is visible only if user already has a saved custom plan
  const [planVisible, setPlanVisible] = useState(!!profile.weeklyPlan)

  const activeDaysCount = WEEK_DAYS.length - selectedRestDays.length

  const canGenerate = selectedRestDays.length >= MIN_REST_DAYS && selectedRestDays.length <= MAX_REST_DAYS
  const selectedRestLabel = useMemo(
    () => selectedRestDays.map(day => t(dayLabelKeys[day])).join(', '),
    [selectedRestDays, t],
  )

  const toggleRestDay = (day: WeekDay) => {
    setSaved(false)
    setSelectedRestDays(current => {
      const next = current.includes(day)
        ? current.filter(restDay => restDay !== day)
        : current.length >= MAX_REST_DAYS ? current : [...current, day]
      // remove from gymDays if now rest
      if (!current.includes(day)) setGymDays(prev => prev.filter(d => d !== day))
      return next
    })
  }

  const handleGymFrequencyChange = (freq: number) => {
    setGymFrequency(freq)
    if (gymDays.length > freq) setGymDays(prev => prev.slice(0, freq))
    setSaved(false)
  }

  const toggleGymDay = (day: WeekDay) => {
    if (selectedRestDays.includes(day)) return
    setGymDays(prev => {
      if (prev.includes(day)) return prev.filter(d => d !== day)
      if (prev.length >= gymFrequency) return prev
      return [...prev, day]
    })
    setSaved(false)
  }

  const handleGenerate = () => {
    if (!canGenerate) return
    // Validate: remove any gym days that are now rest days
    const cleanedGymDays = gymDays.filter(d => !selectedRestDays.includes(d))
    if (cleanedGymDays.length !== gymDays.length) setGymDays(cleanedGymDays)
    const nextPlan = buildMockAiPlan(selectedRestDays, goals, profile.fitnessLevel)
    setDraftPlan(nextPlan)
    updateProfile({ weeklyPlan: nextPlan, gymDays: cleanedGymDays })
    setSaved(true)
    setPlanVisible(true)
  }

  const handleSaveGymDays = () => {
    // Validate: remove any gym days that conflict with rest days
    const cleanedGymDays = gymDays.filter(d => !selectedRestDays.includes(d))
    if (cleanedGymDays.length !== gymDays.length) setGymDays(cleanedGymDays)
    updateProfile({ gymDays: cleanedGymDays })
    setSaved(true)
  }

  // Clear the "saved" flash after 2 s — cleanup prevents state update on unmounted component
  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(t)
  }, [saved])

  return (
    <div className="app-layout">
      <PageHeader title={t('trainingSystem')} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        <div className="training-system-card">
          <p className="workout-card-label">{t('mockAiPlanner')}</p>
          <h2 className="workout-card-name">{t('restDaysFirst')}</h2>
          <p className="training-card-copy">{t('trainingSystemSub')}</p>
          <div className="training-meta-list">
            <span>{t('goals')}: <strong>{goals.map(goal => t(goalLabelKeys[goal])).join(', ')}</strong></span>
            <span>{t('locations')}: <strong>{locations.map(location => t(locationLabelKeys[location])).join(', ')}</strong></span>
            <span>{t('ageAdaptation')}: <strong>{t(ageGuidance.group)}</strong></span>
          </div>
        </div>

        {/* ── Weekly plan — shown only after generate ───────────────────────── */}
        {planVisible && <div className="settings-section">
          <h3 className="settings-section-title">{t('weeklyPlan')}</h3>
          <div className="plan-day-list">
            {WEEK_DAYS.map(day => {
              const isRest = draftPlan[day] === 'rest'
              const isGymDay = hasGym && gymDays.includes(day)
              const isHomeDay = hasHome && !gymDays.includes(day) && !isRest
              return (
                <div key={day} className={`plan-day-row ${draftPlan[day]}`}>
                  <div>
                    <span className="plan-day-name">{t(dayLabelKeys[day])}</span>
                    <span className="plan-day-desc">
                      {isRest
                        ? t('recoveryDayDesc')
                        : isGymDay
                        ? isHebrew ? '🏋️ חדר כושר' : '🏋️ Gym'
                        : isHomeDay
                        ? isHebrew ? '🏠 בית' : '🏠 Home'
                        : t('trainingDayDesc')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!isRest && hasGym && hasHome && (
                      <button
                        className={`plan-location-toggle${isGymDay ? ' gym' : ' home'}`}
                        onClick={() => toggleGymDay(day)}
                        title={isHebrew ? 'לחץ להחליף מיקום' : 'Toggle location'}
                      >
                        {isGymDay ? '🏋️' : '🏠'}
                      </button>
                    )}
                    {!isRest && hasGym && !hasHome && (
                      <span className="plan-location-badge gym">🏋️</span>
                    )}
                    <span className={`focus-pill ${draftPlan[day]}`}>
                      {t(focusLabelKeys[draftPlan[day]])}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {hasGym && hasHome && (
            <p className="settings-helper" style={{ marginTop: 8 }}>
              {isHebrew
                ? 'לחץ על 🏋️/🏠 בכל יום כדי לשנות היכן האימון מתקיים'
                : 'Tap 🏋️/🏠 on any day to switch between gym and home'}
            </p>
          )}
        </div>}

        {/* ── Rest days & regenerate ────────────────────────────────────────── */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('chooseRestDays')}</h3>
          <p className="settings-helper">{t('chooseRestDaysSub')}</p>
          <div className="rest-day-grid">
            {WEEK_DAYS.map(day => (
              <button
                key={day}
                className={`rest-day-chip${selectedRestDays.includes(day) ? ' selected' : ''}`}
                disabled={!selectedRestDays.includes(day) && selectedRestDays.length >= MAX_REST_DAYS}
                onClick={() => toggleRestDay(day)}
              >
                {t(dayLabelKeys[day])}
              </button>
            ))}
          </div>
          <p className={`settings-helper${canGenerate ? '' : ' warning-text'}`}>
            {t('selectedRestDays')}: {selectedRestLabel || t('none')}. {t('restDayLimit')}
          </p>
          <button className="btn-primary" disabled={!canGenerate} onClick={handleGenerate}>
            {saved ? `${t('saved')}!` : t('generateTrainingPlan')}
          </button>
        </div>

        {/* Gym schedule — shown for all users who train at a gym */}
        {hasGym && (
          <div className="settings-section">
            <h3 className="settings-section-title">
              🏋️ {isHebrew ? 'לוח זמנים לחדר כושר' : 'Gym Schedule'}
            </h3>

            {/* Step 1 — frequency */}
            <p className="settings-label" style={{ marginBottom: 8 }}>
              {isHebrew ? 'כמה פעמים בשבוע אתה הולך לחדר כושר?' : 'How many times per week do you go to the gym?'}
            </p>
            <div className="gym-freq-row">
              {[2, 3, 4, 5, 6].filter(n => n <= activeDaysCount).map(n => (
                <button
                  key={n}
                  className={`gym-freq-btn${gymFrequency === n ? ' selected' : ''}`}
                  onClick={() => handleGymFrequencyChange(n)}
                >
                  {n}×
                </button>
              ))}
            </div>
            <p className="settings-helper" style={{ marginTop: 6 }}>
              {isHebrew
                ? `${gymFrequency} פעמים בשבוע · ${gymFrequency * 52} אימונים בשנה`
                : `${gymFrequency}× per week · ~${gymFrequency * 52} sessions/year`}
            </p>

            {/* Step 2 — which days */}
            <p className="settings-label" style={{ margin: '16px 0 8px' }}>
              {isHebrew
                ? `באילו ימים? (${gymDays.length}/${gymFrequency} נבחרו)`
                : `Which days? (${gymDays.length}/${gymFrequency} selected)`}
            </p>
            <div className="gym-day-picker">
              {WEEK_DAYS.map(day => {
                const isRest = selectedRestDays.includes(day)
                const isGym = gymDays.includes(day)
                const maxReached = gymDays.length >= gymFrequency && !isGym
                return (
                  <button
                    key={day}
                    className={`gym-day-chip${isGym ? ' gym' : ''}${isRest ? ' rest' : ''}${maxReached ? ' dim' : ''}`}
                    disabled={isRest || maxReached}
                    onClick={() => toggleGymDay(day)}
                  >
                    <span className="gym-day-chip-name">{t(dayLabelKeys[day])}</span>
                    <span className="gym-day-chip-icon">
                      {isRest ? '😴' : isGym ? '🏋️' : hasHome ? '🏠' : '—'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Summary bar */}
            <div className="gym-summary-bar">
              <span>🏋️ {gymDays.length} {isHebrew ? 'חדר כושר' : 'gym'}</span>
              {hasHome && (
                <span>🏠 {WEEK_DAYS.filter(d => !selectedRestDays.includes(d) && !gymDays.includes(d)).length} {isHebrew ? 'בית' : 'home'}</span>
              )}
              <span>😴 {selectedRestDays.length} {isHebrew ? 'מנוחה' : 'rest'}</span>
            </div>

            <button className="btn-primary" onClick={handleSaveGymDays}>
              {saved ? `✅ ${isHebrew ? 'נשמר!' : 'Saved!'}` : isHebrew ? 'שמור לוח זמנים' : 'Save Schedule'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
