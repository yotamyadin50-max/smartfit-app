import PageHeader from '../components/layout/PageHeader'
import { useEffect, useMemo, useRef, useState } from 'react'
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

import { removeJson } from '../lib/storage'
import { APP_ACCESS_KEY } from '../lib/appAccess'
import {
  notificationsSupported,
  requestPermission,
  getPermissionState,
  scheduleWorkoutReminder,
  cancelWorkoutReminder,
} from '../lib/notifications'

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
  APP_ACCESS_KEY,
  'chat_history',
  'progress_data',
  'temp_ai_cache',
  // Shredding data — per-user, must clear on logout
  'smartfit_shred_food',
  'smartfit_shred_weight',
  'smartfit_shred_saved_meals',
  'smartfit_shred_goal',
  'smartfit_shred_manual_burn',
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
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingPlan, setEditingPlan] = useState(false)
  const [notifPermission, setNotifPermission] = useState(getPermissionState)

  useEffect(() => {
    if (notifications && notifPermission === 'granted') {
      scheduleWorkoutReminder(
        reminderTime,
        language === 'he' ? 'זמן לאימון! 💪' : "Time to work out! 💪",
        language === 'he' ? 'האימון שלך מחכה לך ב-Ascend AI' : 'Your workout is waiting in Ascend AI',
      )
    } else {
      cancelWorkoutReminder()
    }
  }, [notifications, reminderTime, notifPermission, language])

  async function handleToggleNotifications() {
    if (!notifications) {
      const granted = await requestPermission()
      setNotifPermission(getPermissionState())
      if (!granted) {
        alert(language === 'he'
          ? 'נא לאפשר התראות בהגדרות הדפדפן'
          : 'Please allow notifications in your browser settings')
        return
      }
    }
    setNotifications(prev => !prev)
  }

  const restDays = useMemo(
    () => WEEK_DAYS.filter(day => ensureRestDays(weeklyPlan)[day] === 'rest'),
    [weeklyPlan],
  )
  const ageGuidance = useMemo(
    () => getAgeGuidance({ ...profile, age: sanitizeProfileAge(age) }),
    [age, profile],
  )

  const toggleGoal = (value: Goal) => {
    setGoals(current => {
      if (current.includes(value)) {
        if (current.length <= 1) return current
        return current.filter(goal => goal !== value)
      }
      return [...current, value]
    })
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
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
    savedTimerRef.current = window.setTimeout(() => setSaved(false), 2000)
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

  const [openSection, setOpenSection] = useState<string | null>(null)
  const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id)

  const Section = ({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) => {
    const open = openSection === id
    return (
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
        <button
          onClick={() => toggle(id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: open ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
            border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
            fontSize: 15, fontWeight: 600, transition: 'background 0.15s',
          }}
        >
          <span>{icon} {title}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </button>
        {open && (
          <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-layout">
      <PageHeader title={t('settings')} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        <Section id="profile" icon="👤" title={t('profile')}>
          <div className="settings-item" style={{ marginBottom: 8 }}>
            <span className="settings-label">{t('email')}</span>
            <span className="settings-value">{user?.email ?? t('unknown')}</span>
          </div>
        </Section>

        <Section id="language" icon="🌐" title={t('language')}>
          <div className="option-grid col-2">
            {([['en', t('english')], ['he', t('hebrew')]] as [Language, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${language === value ? ' selected' : ''}`} onClick={() => setLanguage(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="age" icon="🎂" title={t('ageAdaptation')}>
          <div className="settings-number-row">
            <label className="settings-label" htmlFor="profile-age">{t('age')}</label>
            <input
              id="profile-age" type="number" className="form-input settings-number-input"
              min={MIN_PROFILE_AGE} max={MAX_PROFILE_AGE} value={age}
              onChange={e => { const n = Number(e.target.value); setAge(Number.isFinite(n) ? n : MIN_PROFILE_AGE) }}
              onBlur={() => setAge(sanitizeProfileAge(age))}
            />
          </div>
          <p className="settings-helper">{t('ageGroup')}: <strong>{t(ageGuidance.group)}</strong>. {t('ageProfileNote')}</p>
        </Section>

        <Section id="goals" icon="🎯" title={t('fitnessGoal')}>
          <div className="option-grid col-2">
            {([['cut', t('toneUp')], ['bulk', t('buildMuscle')], ['fitness', t('generalFitness')], ['health', t('health')]] as [Goal, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${goals.includes(value) ? ' selected' : ''}`} onClick={() => toggleGoal(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="level" icon="💪" title={t('fitnessLevel')}>
          <div className="option-grid col-3">
            {([['beginner', t('beginner')], ['intermediate', t('intermediate')], ['advanced', t('advanced')]] as [FitnessLevel, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${level === value ? ' selected' : ''}`} onClick={() => setLevel(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="locations" icon="📍" title={t('trainingLocations')}>
          <p className="settings-helper">{workoutTypes.length} / 2 {t('selected')}</p>
          <div className="option-grid col-3">
            {([['gym', t('gym')], ['home', t('home')], ['outdoor', t('outdoor')]] as [WorkoutType, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${workoutTypes.includes(value) ? ' selected' : ''}`}
                disabled={!workoutTypes.includes(value) && workoutTypes.length >= 2} onClick={() => toggleWorkoutType(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="plan" icon="📅" title={t('weeklyPlanTitle')}>
          {!editingPlan ? (
            <>
              <div className="weekly-plan-grid" style={{ pointerEvents: 'none' }}>
                {WEEK_DAYS.map(day => {
                  const focus = weeklyPlan[day]
                  const isRest = focus === 'rest'
                  return (
                    <div key={day} className="weekly-plan-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px' }}>
                      <span>{t(dayLabelKeys[day])}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isRest ? 'rgba(255,255,255,0.35)' : '#6366f1', background: isRest ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.13)', borderRadius: 8, padding: '3px 10px' }}>
                        {t(focusLabelKeys[focus])}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button className="btn-secondary" style={{ marginTop: 12, width: 'auto', fontSize: 13, padding: '8px 18px' }} onClick={() => setEditingPlan(true)}>
                ✏️ {language === 'he' ? 'ערוך תוכנית' : 'Edit plan'}
              </button>
            </>
          ) : (
            <>
              <p className="settings-helper">{t('weeklyPlanSub')}</p>
              <div className="weekly-plan-grid">
                {WEEK_DAYS.map(day => (
                  <label key={day} className="weekly-plan-row">
                    <span>{t(dayLabelKeys[day])}</span>
                    <select className="form-input weekly-plan-select" value={weeklyPlan[day]} onChange={e => handlePlanChange(day, e.target.value as ScheduleFocus)}>
                      {SCHEDULE_FOCUSES.map(focus => <option key={focus} value={focus}>{t(focusLabelKeys[focus])}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <p className="settings-helper">{t('restDays')}: {restDays.map(day => t(dayLabelKeys[day])).join(', ')}. {t('autoRestNote')}</p>
              <button className="btn-secondary" style={{ marginTop: 8, width: 'auto', fontSize: 13, padding: '8px 18px' }} onClick={() => setEditingPlan(false)}>
                ✓ {language === 'he' ? 'סיום עריכה' : 'Done editing'}
              </button>
            </>
          )}
        </Section>

        <Section id="diet" icon="🥗" title={t('dietaryPreference')}>
          <div className="option-grid col-2">
            {([['none', t('noRestrictions')], ['vegetarian', t('vegetarian')], ['vegan', t('vegan')], ['gluten-free', t('glutenFree')]] as [NutritionPref, string][]).map(([value, label]) => (
              <button key={value} className={`option-card compact${nutritionPref === value ? ' selected' : ''}`} onClick={() => setNutritionPref(value)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="reminders" icon="⏰" title={t('reminders')}>
          <div className="settings-toggle-row">
            <span className="settings-label">{t('dailyReminder')}</span>
            <button className={`toggle-btn${notifications ? ' on' : ''}`} onClick={handleToggleNotifications} disabled={!notificationsSupported()}>
              {notifications ? 'ON' : 'OFF'}
            </button>
          </div>
          {notifications && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">{t('reminderTime')}</label>
              <input type="time" className="form-input" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
            </div>
          )}
          <button className="btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/reminders')}>
            ⏰ {language === 'he' ? 'ניהול תזכורות' : 'Manage Reminders'}
          </button>
        </Section>

        <Section id="onboarding" icon="📋" title={language === 'he' ? 'שאלון פתיחה' : 'Onboarding Questionnaire'}>
          <p className="settings-helper">
            {language === 'he' ? 'רוצה לעדכן את הפרופיל שלך מההתחלה?' : 'Want to update your profile from scratch?'}
          </p>
          <button className="btn-primary" style={{ background: '#6366f1', borderColor: '#6366f1' }}
            onClick={() => {
              if (window.confirm(language === 'he' ? 'זה יאפס את כל ההגדרות שלך ויחזיר אותך לשאלון. להמשיך?' : 'This will reset your settings and take you back to the questionnaire. Continue?')) {
                updateProfile({ onboardingComplete: false })
                navigate('/onboarding')
              }
            }}>
            📋 {language === 'he' ? 'מלא מחדש את השאלון' : 'Redo Questionnaire'}
          </button>
        </Section>

        <button className="btn-primary" style={{ marginTop: 8 }} onClick={handleSave}>
          {saved ? `${t('saved')}!` : t('saveChanges')}
        </button>

        <div className="account-actions">
          <button className="btn-secondary" onClick={handleCreateNewAccount}>{t('createAccount')}</button>
          <button className="btn-signout" onClick={handleSignOut}>{t('signOut')}</button>
        </div>
      </div>
    </div>
  )
}
