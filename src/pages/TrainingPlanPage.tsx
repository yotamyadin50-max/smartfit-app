import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import BottomNav from '../components/layout/BottomNav'

const MIN_REST_DAYS = 2
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
  aerobic: 'aerobicWorkout',
  rest: 'restDay',
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
  bulk: ['goal', 'legs', 'arms', 'abs'],
  endurance: ['aerobic', 'legs', 'goal', 'abs'],
  flexibility: ['abs', 'goal', 'aerobic', 'legs'],
  fitness: ['goal', 'aerobic', 'legs', 'arms', 'abs'],
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

function buildMockAiPlan(restDays: WeekDay[], goals: Goal[], fitnessLevel: FitnessLevel): WeeklyPlan {
  const restSet = new Set(restDays)
  const focusQueue = getMockAiFocusQueue(goals, fitnessLevel)
  const plan = {} as WeeklyPlan
  let focusIndex = 0

  WEEK_DAYS.forEach(day => {
    if (restSet.has(day)) {
      plan[day] = 'rest'
      return
    }

    plan[day] = focusQueue[focusIndex % focusQueue.length]
    focusIndex += 1
  })

  return plan
}

export default function TrainingPlanPage() {
  const { profile, updateProfile } = useUser()
  const { t } = useI18n()
  const navigate = useNavigate()

  const currentPlan = getProfileWeeklyPlan(profile)
  const goals = getProfileGoals(profile)
  const locations = getProfileWorkoutTypes(profile)
  const ageGuidance = getAgeGuidance(profile)
  const hasGym = locations.includes('gym')
  const hasHome = locations.includes('home')
  const isMultiLocation = hasGym && hasHome

  const [selectedRestDays, setSelectedRestDays] = useState<WeekDay[]>(getRestDays(currentPlan))
  const [draftPlan, setDraftPlan] = useState<WeeklyPlan>(currentPlan)
  const [gymDays, setGymDays] = useState<WeekDay[]>(profile.gymDays ?? [])
  const [saved, setSaved] = useState(false)

  const canGenerate = selectedRestDays.length >= MIN_REST_DAYS && selectedRestDays.length <= MAX_REST_DAYS
  const selectedRestLabel = useMemo(
    () => selectedRestDays.map(day => t(dayLabelKeys[day])).join(', '),
    [selectedRestDays, t],
  )

  const toggleRestDay = (day: WeekDay) => {
    setSaved(false)
    setSelectedRestDays(current => {
      if (current.includes(day)) return current.filter(restDay => restDay !== day)
      if (current.length >= MAX_REST_DAYS) return current
      return [...current, day]
    })
  }

  const toggleGymDay = (day: WeekDay) => {
    if (selectedRestDays.includes(day)) return // can't be gym day if it's rest
    setGymDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
    setSaved(false)
  }

  const handleGenerate = () => {
    if (!canGenerate) return
    const nextPlan = buildMockAiPlan(selectedRestDays, goals, profile.fitnessLevel)
    setDraftPlan(nextPlan)
    updateProfile({ weeklyPlan: nextPlan, gymDays })
    setSaved(true)
  }

  const handleSaveGymDays = () => {
    updateProfile({ gymDays })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="app-layout">
      <div className="page-content">
        <header className="dashboard-header">
          <div>
            <p className="greeting-sub">{t('aiInsightDemo')}</p>
            <h1 className="page-title training-plan-title">{t('trainingSystem')}</h1>
          </div>
          <button className="settings-icon-btn" onClick={() => navigate('/dashboard')}>
            {t('back')}
          </button>
        </header>

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

        {/* Gym days selector — only for users who train at both gym and home */}
        {isMultiLocation && (
          <div className="settings-section">
            <h3 className="settings-section-title">
              🏋️ {t('language') === 'he' ? 'ימי חדר כושר' : 'Gym Days'}
            </h3>
            <p className="settings-helper">
              {t('language') === 'he'
                ? 'סמן אילו ימים אתה הולך לחדר כושר — שאר הימים יהיו אימון בית'
                : 'Mark which days you go to the gym — the rest will be home workouts'}
            </p>
            <div className="rest-day-grid">
              {WEEK_DAYS.map(day => {
                const isRest = selectedRestDays.includes(day)
                const isGym = gymDays.includes(day)
                return (
                  <button
                    key={day}
                    onClick={() => toggleGymDay(day)}
                    disabled={isRest}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: isRest ? 'default' : 'pointer',
                      fontWeight: 700,
                      fontSize: 12,
                      background: isRest
                        ? 'rgba(255,255,255,0.05)'
                        : isGym
                        ? '#22c55e'
                        : 'rgba(255,255,255,0.1)',
                      color: isRest ? 'rgba(255,255,255,0.25)' : isGym ? '#000' : '#fff',
                    }}
                  >
                    {t(dayLabelKeys[day])}
                    {!isRest && (
                      <span style={{ display: 'block', fontSize: 10, marginTop: 2 }}>
                        {isGym ? '🏋️' : '🏠'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="settings-helper">
              🏋️ {gymDays.length} {t('language') === 'he' ? 'ימי חדר כושר' : 'gym days'} ·
              🏠 {WEEK_DAYS.filter(d => !selectedRestDays.includes(d) && !gymDays.includes(d)).length} {t('language') === 'he' ? 'ימי בית' : 'home days'}
            </p>
            <button className="btn-primary" onClick={handleSaveGymDays}>
              {saved ? '✅' : (t('language') === 'he' ? 'שמור ימי חדר כושר' : 'Save gym days')}
            </button>
          </div>
        )}

        <div className="settings-section">
          <h3 className="settings-section-title">{t('weeklyPlan')}</h3>
          <div className="plan-day-list">
            {WEEK_DAYS.map(day => (
              <div key={day} className={`plan-day-row ${draftPlan[day]}`}>
                <div>
                  <span className="plan-day-name">{t(dayLabelKeys[day])}</span>
                  <span className="plan-day-desc">
                    {draftPlan[day] === 'rest'
                      ? t('recoveryDayDesc')
                      : isMultiLocation
                      ? gymDays.includes(day)
                        ? '🏋️'
                        : '🏠'
                      : t('trainingDayDesc')}
                  </span>
                </div>
                <span className={`focus-pill ${draftPlan[day]}`}>
                  {t(focusLabelKeys[draftPlan[day]])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
