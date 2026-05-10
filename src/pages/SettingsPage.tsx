import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n, type Language } from '../context/I18nContext'
import {
  MAX_PROFILE_AGE,
  MIN_PROFILE_AGE,
  ensureRestDays,
  getAgeGuidance,
  getProfileAge,
  getProfileGoals,
  getProfileWeeklyPlan,
  getProfileWorkoutTypes,
  SCHEDULE_FOCUSES,
  WEEK_DAYS,
  sanitizeProfileAge,
  useUser,
  type FitnessLevel,
  type Goal,
  type NutritionPref,
  type ScheduleFocus,
  type WeekDay,
  type WeeklyPlan,
  type WorkoutType,
} from '../context/UserContext'
import BottomNav from '../components/layout/BottomNav'
import { removeJson } from '../lib/storage'

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

const SENSITIVE_LOCAL_KEYS = [
  'smartfit_profile',
  'smartfit_stats',
  'smartfit_chat_history',
  'smartfit_ai_reply_cache',
  'smartfit_ai_tools_progress',
  'smartfit_ai_tools_profile',
  'smartfit_workout_progress',
  'smartfit_cardio_progress',
  'smartfit_weekly_meal_plans',
  'smartfit_weekly_nutrition_plan',
  'smartfit_saved_meals',
  'smartfit_saved_recipes',
  'smartfit_connected_watch',
  'smartfit_connected_scale',
  'smartfit_weight_history',
  'smartfit_location_consent',
  'chat_history',
  'progress_data',
  'temp_ai_cache',
]

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { profile, updateProfile, resetUserData } = useUser()
  const { t, language, setLanguage } = useI18n()
  const navigate = useNavigate()

  const [age, setAge] = useState(getProfileAge(profile))
  const [goals, setGoals] = useState<Goal[]>(getProfileGoals(profile))
  const [level, setLevel] = useState<FitnessLevel>(profile.fitnessLevel)
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>(getProfileWorkoutTypes(profile))
  const [nutritionPref, setNutritionPref] = useState<NutritionPref>(profile.nutritionPref)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(getProfileWeeklyPlan(profile))
  const [notifications, setNotifications] = useState(profile.notificationsEnabled)
  const [reminderTime, setReminderTime] = useState(profile.reminderTime)
  const [saved, setSaved] = useState(false)

  const restDays = useMemo(
    () => WEEK_DAYS.filter(day => ensureRestDays(weeklyPlan)[day] === 'rest'),
    [weeklyPlan],
  )
  const ageGuidance = useMemo(
    () => getAgeGuidance({ ...profile, age: sanitizeProfileAge(age) }),
    [age, profile],
  )

  const toggleGoal = (value: Goal) => {
    setGoals(current =>
      current.includes(value)
        ? current.filter(goal => goal !== value)
        : [...current, value],
    )
  }

  const toggleWorkoutType = (value: WorkoutType) => {
    setWorkoutTypes(current => {
      if (current.includes(value)) return current.filter(type => type !== value)
      if (current.length >= 2) return current
      return [...current, value]
    })
  }

  const handlePlanChange = (day: WeekDay, focus: ScheduleFocus) => {
    setWeeklyPlan(current => ({ ...current, [day]: focus }))
  }

  const handleSave = () => {
    const safeGoals = goals.length > 0 ? goals : [profile.goal]
    const safeWorkoutTypes = workoutTypes.length > 0 ? workoutTypes : [profile.workoutType]
    const planWithRest = ensureRestDays(weeklyPlan)

    setWeeklyPlan(planWithRest)
    updateProfile({
      age: sanitizeProfileAge(age),
      goals: safeGoals,
      goal: safeGoals[0],
      fitnessLevel: level,
      workoutTypes: safeWorkoutTypes,
      workoutType: safeWorkoutTypes[0],
      nutritionPref,
      weeklyPlan: planWithRest,
      notificationsEnabled: notifications,
      reminderTime,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const clearAccountLocalData = () => {
    SENSITIVE_LOCAL_KEYS.forEach(removeJson)
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('smartfit_rewarded_')) removeJson(key)
    }
  }

  const handleSignOut = async () => {
    const approved = window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך להתנתק?' : 'Are you sure you want to log out?')
    if (!approved) return

    resetUserData()
    clearAccountLocalData()
    await signOut()
    window.alert(language === 'he' ? 'נותקת בהצלחה' : 'You have been logged out successfully')
    navigate('/login', { replace: true })
  }

  const handleCreateNewAccount = async () => {
    resetUserData()
    clearAccountLocalData()
    await signOut()
    navigate('/signup')
  }

  return (
    <div className="app-layout">
      <div className="page-content">
        <h1 className="page-title">{t('settings')}</h1>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('profile')}</h3>
          <div className="settings-item">
            <span className="settings-label">{t('email')}</span>
            <span className="settings-value">{user?.email ?? t('unknown')}</span>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('ageAdaptation')}</h3>
          <div className="settings-number-row">
            <label className="settings-label" htmlFor="profile-age">{t('age')}</label>
            <input
              id="profile-age"
              type="number"
              className="form-input settings-number-input"
              min={MIN_PROFILE_AGE}
              max={MAX_PROFILE_AGE}
              value={age}
              onChange={event => {
                const nextAge = Number(event.target.value)
                setAge(Number.isFinite(nextAge) ? nextAge : MIN_PROFILE_AGE)
              }}
              onBlur={() => setAge(sanitizeProfileAge(age))}
            />
          </div>
          <p className="settings-helper">
            {t('ageGroup')}: <strong>{t(ageGuidance.group)}</strong>. {t('ageProfileNote')}
          </p>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('language')}</h3>
          <div className="option-grid col-2">
            {([
              ['en', t('english')],
              ['he', t('hebrew')],
            ] as [Language, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${language === value ? ' selected' : ''}`} onClick={() => setLanguage(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('fitnessGoal')}</h3>
          <div className="option-grid col-2">
            {([
              ['cut', t('toneUp')],
              ['bulk', t('buildMuscle')],
              ['fitness', t('generalFitness')],
              ['health', t('health')],
            ] as [Goal, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${goals.includes(value) ? ' selected' : ''}`} onClick={() => toggleGoal(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('fitnessLevel')}</h3>
          <div className="option-grid col-3">
            {([
              ['beginner', t('beginner')],
              ['intermediate', t('intermediate')],
              ['advanced', t('advanced')],
            ] as [FitnessLevel, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${level === value ? ' selected' : ''}`} onClick={() => setLevel(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('trainingLocations')}</h3>
          <p className="settings-helper">{workoutTypes.length} / 2 {t('selected')}</p>
          <div className="option-grid col-3">
            {([
              ['gym', t('gym')],
              ['home', t('home')],
              ['outdoor', t('outdoor')],
            ] as [WorkoutType, string][]).map(([value, label]) => (
              <button
                key={value}
                className={`option-card compact${workoutTypes.includes(value) ? ' selected' : ''}`}
                disabled={!workoutTypes.includes(value) && workoutTypes.length >= 2}
                onClick={() => toggleWorkoutType(value)}
              >
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('weeklyPlanTitle')}</h3>
          <p className="settings-helper">{t('weeklyPlanSub')}</p>
          <div className="weekly-plan-grid">
            {WEEK_DAYS.map(day => (
              <label key={day} className="weekly-plan-row">
                <span>{t(dayLabelKeys[day])}</span>
                <select
                  className="form-input weekly-plan-select"
                  value={weeklyPlan[day]}
                  onChange={event => handlePlanChange(day, event.target.value as ScheduleFocus)}
                >
                  {SCHEDULE_FOCUSES.map(focus => (
                    <option key={focus} value={focus}>{t(focusLabelKeys[focus])}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="settings-helper">
            {t('restDays')}: {restDays.map(day => t(dayLabelKeys[day])).join(', ')}. {t('autoRestNote')}
          </p>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('dietaryPreference')}</h3>
          <div className="option-grid col-2">
            {([
              ['none', t('noRestrictions')],
              ['vegetarian', t('vegetarian')],
              ['vegan', t('vegan')],
              ['gluten-free', t('glutenFree')],
            ] as [NutritionPref, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${nutritionPref === value ? ' selected' : ''}`} onClick={() => setNutritionPref(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">{t('reminders')}</h3>
          <div className="settings-toggle-row">
            <span className="settings-label">{t('dailyReminder')}</span>
            <button
              className={`toggle-btn${notifications ? ' on' : ''}`}
              onClick={() => setNotifications(isEnabled => !isEnabled)}
            >
              {notifications ? 'ON' : 'OFF'}
            </button>
          </div>
          {notifications && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">{t('reminderTime')}</label>
              <input
                type="time"
                className="form-input"
                value={reminderTime}
                onChange={event => setReminderTime(event.target.value)}
              />
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSave}>
          {saved ? `${t('saved')}!` : t('saveChanges')}
        </button>

        <div className="account-actions">
          <button className="btn-secondary" onClick={handleCreateNewAccount}>
            {t('createAccount')}
          </button>
          <button className="btn-signout" onClick={handleSignOut}>
            {t('signOut')}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
