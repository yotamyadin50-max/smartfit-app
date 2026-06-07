import { useState, type FormEvent } from 'react'
import {
  createReminder, saveReminder, requestNotificationPermission,
  syncScheduledReminders,
  DAY_LABELS_HE, DAY_LABELS_EN,
} from '../lib/remindersService'
import { useNavigate, Link } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { useAuth } from '../context/AuthContext'
import OnboardingQuestionnaire from '../components/OnboardingQuestionnaire'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  DEFAULT_PROFILE_AGE,
  MAX_PROFILE_AGE,
  MIN_PROFILE_AGE,
  WEEK_DAYS,
  sanitizeProfileAge,
  useUser,
  type DailyActivityLevel,
  type DietType,
  type EnergyLevel,
  type EquipmentOption,
  type FitnessLevel,
  type Goal,
  type Gender,
  type HabitChallenge,
  type PainIntensity,
  type ScheduleFocus,
  type SensitiveArea,
  type UserProfile,
  type WeekDay,
  type WeeklyPlan,
  type WorkoutTimePreference,
} from '../context/UserContext'

type StepProps = {
  data: Partial<UserProfile>
  onBack: () => void
  onNext: (data: Partial<UserProfile>) => void
  onSkip: (data?: Partial<UserProfile>) => void
  step: number
  total: number
}

const copy = {
  en: {
    activityHigh: 'Very active',
    activityLow: 'Mostly sitting',
    activityMedium: 'Moderately active',
    back: 'Back',
    basicSub: 'This helps Ascend AI tune workouts, meals, and AI answers.',
    basicTitle: 'Basic details',
    beginnerDesc: 'No consistent training experience',
    consistency: 'Staying consistent',
    toning: 'Toning & shaping',
    energyHigh: 'High',
    energyLow: 'Low',
    energyMedium: 'Medium',
    equipmentBands: 'Resistance bands',
    equipmentDumbbells: 'Dumbbells',
    equipmentGym: 'Gym',
    equipmentNone: 'No equipment',
    equipmentPullupBar: 'Pull-up bar',
    equipmentSub: 'Choose what is usually available.',
    equipmentTitle: 'Available equipment',
    female: 'Female',
    fixedNo: 'No fixed time',
    fixedYes: 'Yes, usually',
    flexibility: 'Flexibility',
    gender: 'Gender',
    generalFitness: 'General fitness',
    habitsSub: 'These answers help the coach choose realistic recommendations.',
    habitsTitle: 'Habits and consistency',
    hardestConsistency: 'Staying consistent',
    hardestMotivation: 'Motivation',
    hardestStart: 'Getting started',
    hardestTime: 'Time',
    healthSub: 'Keep this general. Stop and ask a professional if something feels unsafe.',
    healthTitle: 'Health and recovery',
    height: 'Height',
    injuriesNo: 'No pain or injuries',
    injuriesYes: 'Yes, there is something sensitive',
    lifestyle: 'Lifestyle improvement',
    male: 'Male',
    mealsPerDay: 'Meals per day',
    muscle: 'Muscle strength',
    name: 'Name',
    knees: 'Knees',
    nutritionNo: 'Not really',
    nutritionSub: 'Meals and recipes will respect these preferences.',
    nutritionTitle: 'Nutrition habits',
    nutritionYes: 'Yes',
    optional: 'optional',
    other: 'Other',
    painWarning: 'The system gives general information only and does not replace professional advice.',
    preferNot: 'Prefer not to say',
    progress: 'Questionnaire progress',
    shoulders: 'Shoulders',
    sleepHours: 'Average sleep hours',
    stamina: 'Endurance',
    step: 'Step',
    timePerWorkout: 'Time per workout',
    timeSub: 'Pick a realistic weekly rhythm.',
    timeTitle: 'Time and availability',
    trainingDays: 'Workouts per week',
    weight: 'Weight',
  },
  he: {
    activityHigh: 'פעיל מאוד',
    activityLow: 'בעיקר יושב',
    activityMedium: 'פעילות בינונית',
    back: 'גב',
    basicSub: 'זה עוזר ל-Ascend AI להתאים אימונים, תזונה ותשובות AI.',
    basicTitle: 'פרטים בסיסיים',
    beginnerDesc: 'אין ניסיון קבוע באימונים',
    consistency: 'התמדה באימונים',
    toning: 'הרזיה וחיטוב',
    energyHigh: 'גבוהה',
    energyLow: 'נמוכה',
    energyMedium: 'בינונית',
    equipmentBands: 'גומיות',
    equipmentDumbbells: 'משקולות',
    equipmentGym: 'חדר כושר',
    equipmentNone: 'בלי ציוד',
    equipmentPullupBar: 'מתח',
    equipmentSub: 'בחר את מה שבדרך כלל זמין לך.',
    equipmentTitle: 'ציוד זמין',
    female: 'נקבה',
    fixedNo: 'אין זמן קבוע',
    fixedYes: 'כן, בדרך כלל',
    flexibility: 'גמישות',
    gender: 'מין',
    generalFitness: 'כושר כללי',
    habitsSub: 'התשובות עוזרות למאמן לבחור המלצות ריאליות.',
    habitsTitle: 'הרגלים והתמדה',
    hardestConsistency: 'להתמיד',
    hardestMotivation: 'מוטיבציה',
    hardestStart: 'להתחיל',
    hardestTime: 'זמן',
    healthSub: 'השאר את זה כללי. אם משהו מרגיש לא בטוח, עצור ופנה לאיש מקצוע.',
    healthTitle: 'בריאות והתאוששות',
    height: 'גובה',
    injuriesNo: 'אין כאבים או פציעות',
    injuriesYes: 'כן, יש משהו רגיש',
    lifestyle: 'שיפור אורח חיים',
    male: 'זכר',
    mealsPerDay: 'ארוחות ביום',
    muscle: 'חיזוק שרירים',
    name: 'שם',
    knees: 'ברכיים',
    nutritionNo: 'לא ממש',
    nutritionSub: 'ארוחות ומתכונים יתחשבו בהעדפות האלה.',
    nutritionTitle: 'הרגלי תזונה',
    nutritionYes: 'כן',
    optional: 'אופציונלי',
    other: 'אחר',
    painWarning: 'המערכת נותנת מידע כללי בלבד ואינה מחליפה ייעוץ מקצועי.',
    preferNot: 'מעדיף לא לציין',
    progress: 'התקדמות השאלון',
    shoulders: 'כתפיים',
    sleepHours: 'שעות שינה ממוצעות',
    stamina: 'סיבולת',
    step: 'שלב',
    timePerWorkout: 'זמן לכל אימון',
    timeSub: 'בחר קצב שבועי שבאמת אפשר לעמוד בו.',
    timeTitle: 'זמן וזמינות',
    trainingDays: 'אימונים בשבוע',
    weight: 'משקל',
  },
} as const

function getWorkoutDuration(value: number): UserProfile['workoutDuration'] {
  if (value <= 10) return 10
  if (value <= 20) return 20
  if (value <= 30) return 30
  if (value <= 45) return 45
  return 60
}

function sanitizeNumber(value: string, fallback: number, min: number, max: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function ProgressHeader({ step, total }: { step: number; total: number }) {
  const { language } = useI18n()
  const text = copy[language]

  return (
    <>
      <div className="onboard-dots">
        {Array.from({ length: total }).map((_, index) => (
          <span key={`onboard-dot-${total}-${index}`} className={`onboard-dot${index < step ? ' filled' : ''}`} />
        ))}
      </div>
      <progress className="form-input" value={step} max={total} aria-label={text.progress} />
      <p className="option-hint">{text.step} {step} / {total}</p>
    </>
  )
}

function NavButtons({ onBack, onSkip, canContinue = true, isFirst = false, finish = false }: {
  canContinue?: boolean
  finish?: boolean
  isFirst?: boolean
  onBack: () => void
  onSkip: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="onboard-nav">
      {!isFirst && <button className="btn-ghost" onClick={onBack}>{t('back')}</button>}
      <button className="btn-ghost" onClick={onSkip}>{t('skip')}</button>
      <button className="btn-primary onboard-next" type="submit" disabled={!canContinue}>
        {finish ? t('letsGo') : t('continue')}
      </button>
    </div>
  )
}

function StepAuth({ onNext, step, total }: Pick<StepProps, 'onNext' | 'step' | 'total'>) {
  const { signUp, user } = useAuth()
  const { isHebrew, setLanguage } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError(isHebrew ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError(isHebrew ? 'הסיסמאות אינן תואמות' : 'Passwords do not match')
      return
    }
    setLoading(true)
    const { error: signUpError } = await signUp(email.trim(), password)
    setLoading(false)
    if (signUpError) { setError(signUpError); return }
    onNext({})
  }

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      setError(isHebrew ? 'כניסה עם גוגל אינה זמינה במצב דמו' : 'Google sign-in is not available in demo mode')
      return
    }
    // In a native Capacitor app the WebView has no real domain — Google's OAuth
    // redirect (capacitor://localhost/dashboard) is rejected by Google.
    // Until deep-link OAuth is configured, prompt the user to use email/password.
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        setError(isHebrew
          ? 'כניסה עם גוגל אינה זמינה בגרסת האפליקציה — השתמש באימייל וסיסמה'
          : 'Google sign-in is not available in the app — please use email and password')
        return
      }
    } catch { /* not a Capacitor build — continue normally */ }
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    })
    setGoogleLoading(false)
  }

  // Already logged in — show a "continue with this account" screen
  if (user) {
    return (
      <div className="onboard-step">
        <ProgressHeader step={step} total={total} />
        <h2 className="onboard-title">{isHebrew ? 'כבר מחובר' : 'Already signed in'}</h2>
        <p className="onboard-sub" style={{ wordBreak: 'break-all' }}>{user.email}</p>
        <p className="onboard-sub" style={{ marginTop: 8 }}>
          {isHebrew
            ? 'נמשיך עם החשבון הקיים שלך להשלמת ההגדרות.'
            : 'We\'ll continue with your existing account to finish setup.'}
        </p>
        <button type="button" className="btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={() => onNext({})}>
          {isHebrew ? 'המשך ←' : 'Continue →'}
        </button>
      </div>
    )
  }

  return (
    <form className="onboard-step" onSubmit={handleSubmit} noValidate>
      <ProgressHeader step={step} total={total} />

      {/* Language selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          style={{
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: !isHebrew ? '#7c3aed' : 'rgba(255,255,255,0.1)',
            color: !isHebrew ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        >🇬🇧 EN</button>
        <button
          type="button"
          onClick={() => setLanguage('he')}
          style={{
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: isHebrew ? '#7c3aed' : 'rgba(255,255,255,0.1)',
            color: isHebrew ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        >🇮🇱 עב׳</button>
      </div>

      <h2 className="onboard-title">{isHebrew ? 'יצירת חשבון' : 'Create your account'}</h2>
      <p className="onboard-sub">{isHebrew ? 'הנתונים שלך שמורים ומאובטחים.' : 'Your data is saved and secure.'}</p>

      {error && <div className="error-banner">{error}</div>}

      {/* Google sign-in */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 16,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
        {googleLoading
          ? (isHebrew ? 'מתחבר...' : 'Connecting...')
          : (isHebrew ? 'המשך עם Google' : 'Continue with Google')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{isHebrew ? 'או עם מייל' : 'or with email'}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
      </div>

      <div className="form-group">
        <label className="form-label">{isHebrew ? 'אימייל' : 'Email'}</label>
        <input id="ob-email" type="email" className="form-input" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
      </div>

      <div className="form-group">
        <label className="form-label">{isHebrew ? 'סיסמה' : 'Password'}</label>
        <input id="ob-password" type="password" className="form-input"
          placeholder={isHebrew ? 'לפחות 6 תווים' : 'At least 6 characters'}
          value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="new-password" minLength={6} required />
      </div>

      <div className="form-group">
        <label className="form-label">{isHebrew ? 'אימות סיסמה' : 'Confirm password'}</label>
        <input id="ob-confirm" type="password" className="form-input" placeholder="••••••••"
          value={confirm} onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password" required />
      </div>

      <button type="submit" className="btn-primary onboard-next" disabled={loading}>
        {loading ? (isHebrew ? 'יוצר חשבון...' : 'Creating account…') : (isHebrew ? 'המשך' : 'Continue')}
      </button>

      <p className="auth-footer" style={{ marginTop: 16 }}>
        {isHebrew ? 'כבר יש חשבון?' : 'Already have an account?'}{' '}
        <Link to="/login">{isHebrew ? 'כניסה' : 'Sign in'}</Link>
      </p>
    </form>
  )
}

function StepBasic({ onNext, onSkip, step, total }: StepProps) {
  const { language, isHebrew, t, setLanguage } = useI18n()
  const text = copy[language]
  const [name,      setName]      = useState('')
  const [ageStr,    setAgeStr]    = useState(String(DEFAULT_PROFILE_AGE))
  const [gender,    setGender]    = useState<Gender>('prefer_not')
  const [heightStr, setHeightStr] = useState('170')
  const [weight,    setWeight]    = useState('')
  // Metric by default for Hebrew, imperial for English
  const [useMetric, setUseMetric] = useState(!isHebrew ? true : true)

  const heightLabel = useMetric
    ? (isHebrew ? 'גובה (ס״מ)' : 'Height (cm)')
    : (isHebrew ? 'גובה (אינץ׳)' : 'Height (inches)')
  const weightLabel = useMetric
    ? (isHebrew ? 'משקל (ק״ג)' : 'Weight (kg)')
    : (isHebrew ? 'משקל (פאונד)' : 'Weight (lbs)')

  // Convert from display units to metric for storage
  const toMetricHeight = (val: string) => {
    const n = parseFloat(val)
    if (!Number.isFinite(n)) return 170
    return useMetric ? n : Math.round(n * 2.54)
  }
  const toMetricWeight = (val: string) => {
    const n = parseFloat(val)
    if (!Number.isFinite(n)) return undefined
    return useMetric ? n : Math.round(n * 0.453592)
  }

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      const heightCm = sanitizeNumber(String(toMetricHeight(heightStr)), 170, 90, 230)
      const rawWeight = toMetricWeight(weight)
      onNext({
        age: sanitizeProfileAge(parseInt(ageStr) || DEFAULT_PROFILE_AGE),
        gender,
        heightCm,
        name: name.trim(),
        useMetric,
        weightKg: rawWeight != null ? sanitizeNumber(String(rawWeight), 70, 25, 250) : undefined,
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.basicTitle}</h2>
      <p className="onboard-sub">{text.basicSub}</p>

      {/* Units toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button"
          onClick={() => setUseMetric(true)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: useMetric ? '#7c3aed' : 'rgba(255,255,255,0.1)',
            color: useMetric ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        >{isHebrew ? '📏 מטרי (ק״ג, ס״מ)' : '📏 Metric (kg, cm)'}</button>
        <button type="button"
          onClick={() => { setUseMetric(false); setLanguage('en') }}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: !useMetric ? '#7c3aed' : 'rgba(255,255,255,0.1)',
            color: !useMetric ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        >📐 Imperial (lbs, in)</button>
      </div>

      <div className="form-group">
        <label className="form-label">{text.name} ({text.optional})</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('age')}</label>
        <input className="form-input" type="number" min={MIN_PROFILE_AGE} max={MAX_PROFILE_AGE}
          value={ageStr} onChange={e => setAgeStr(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">{text.gender} ({text.optional})</label>
        <select className="form-input" value={gender} onChange={e => setGender(e.target.value as Gender)}>
          <option value="prefer_not">{text.preferNot}</option>
          <option value="male">{text.male}</option>
          <option value="female">{text.female}</option>
          <option value="other">{text.other}</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">{heightLabel}</label>
        <input className="form-input" type="number"
          min={useMetric ? 90 : 35} max={useMetric ? 230 : 91}
          value={heightStr} onChange={e => setHeightStr(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">{weightLabel} ({text.optional})</label>
        <input className="form-input" type="number"
          min={useMetric ? 25 : 55} max={useMetric ? 250 : 550}
          value={weight} onChange={e => setWeight(e.target.value)} />
      </div>
      <NavButtons isFirst onBack={() => undefined} onSkip={() => onSkip({ age: DEFAULT_PROFILE_AGE, heightCm: 170, useMetric: true })} />
    </form>
  )
}

function StepGoals({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const text = copy[language]
  const [selected, setSelected] = useState<Goal[]>(['fitness'])
  const options: Array<{ label: string; value: Goal }> = [
    { value: 'cut', label: text.toning },
    { value: 'fitness', label: text.generalFitness },
    { value: 'bulk', label: text.muscle },
    { value: 'endurance', label: text.stamina },
    { value: 'flexibility', label: text.flexibility },
  ]

  const toggle = (value: Goal) => setSelected(current =>
    current.includes(value) ? current.filter(item => item !== value) : [...current, value],
  )

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ goal: selected[0] ?? 'fitness', goals: selected.length ? selected : ['fitness'] })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{language === 'he' ? 'מה המטרות שלך?' : 'What are your goals?'}</h2>
      <p className="onboard-sub">{language === 'he' ? 'אפשר לבחור יותר ממטרה אחת.' : 'You can choose more than one goal.'}</p>
      <div className="option-grid">
        {options.map(option => (
          <button type="button" key={option.value} className={`option-card${selected.includes(option.value) ? ' selected' : ''}`} onClick={() => toggle(option.value)}>
            <span className="option-label">{option.label}</span>
          </button>
        ))}
      </div>
      <NavButtons canContinue={selected.length > 0} onBack={onBack} onSkip={() => onSkip({ goal: 'fitness', goals: ['fitness'] })} />
    </form>
  )
}

function StepLevel({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { isHebrew, t } = useI18n()
  const [level, setLevel] = useState<FitnessLevel>('beginner')

  const options: Array<{ desc: string; icon: string; label: string; value: FitnessLevel }> = [
    {
      value: 'beginner', icon: '🌱',
      label: t('beginner'),
      desc: isHebrew
        ? 'לא מתאמן בקביעות, או פחות מ-3 חודשים'
        : 'No consistent training, or less than 3 months',
    },
    {
      value: 'intermediate', icon: '💪',
      label: t('intermediate'),
      desc: isHebrew
        ? 'מתאמן בקביעות 3-12 חודשים'
        : 'Training consistently for 3-12 months',
    },
    {
      value: 'advanced', icon: '🏆',
      label: t('advanced'),
      desc: isHebrew
        ? 'מתאמן ברצינות יותר משנה'
        : 'Training seriously for over a year',
    },
  ]

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ fitnessLevel: level, level })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{t('onboardLevelTitle')}</h2>
      <p className="onboard-sub">{t('onboardLevelSub')}</p>
      <div className="option-grid" style={{ gridTemplateColumns: '1fr' }}>
        {options.map(option => (
          <button
            type="button" key={option.value}
            className={`option-card${level === option.value ? ' selected' : ''}`}
            onClick={() => setLevel(option.value)}
            style={{ textAlign: 'start', padding: '14px 18px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{option.icon}</span>
              <div>
                <span className="option-label" style={{ display: 'block', fontSize: 16 }}>{option.label}</span>
                <span className="option-desc" style={{ fontSize: 12, marginTop: 2, display: 'block' }}>{option.desc}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <NavButtons onBack={onBack} onSkip={() => onSkip({ fitnessLevel: 'beginner', level: 'beginner' })} />
    </form>
  )
}

type ExtendedDuration = 10 | 20 | 30 | 45 | 60 | 75 | 90

function StepTime({ data, onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const text = copy[language]
  const isHebrew = language === 'he'

  const isMultiLocation =
    (data.workoutTypes ?? []).includes('gym') &&
    (data.workoutTypes ?? []).includes('home')

  const [daysStr, setDaysStr] = useState('3')
  const [duration, setDuration] = useState<UserProfile['workoutDuration']>(30)
  const [homeDuration, setHomeDuration] = useState<ExtendedDuration>(30)
  const [gymDuration, setGymDuration] = useState<ExtendedDuration>(45)

  const durations: UserProfile['workoutDuration'][] = [10, 20, 30, 45]
  const homeDurations: ExtendedDuration[] = [10, 20, 30, 45, 60, 75, 90]
  const gymDurations:  ExtendedDuration[] = [20, 30, 45, 60, 75, 90]

  const durationLabel = (n: number) => `${n} ${isHebrew ? 'דק׳' : 'min'}`

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      const workoutDays = sanitizeNumber(daysStr, 3, 1, 7)
      if (isMultiLocation) {
        onNext({
          workout_days: workoutDays,
          workout_time: homeDuration,
          workoutDuration: homeDuration,
          homeWorkoutDuration: homeDuration,
          gymWorkoutDuration: gymDuration,
        })
      } else {
        onNext({ workout_days: workoutDays, workout_time: duration, workoutDuration: duration })
      }
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.timeTitle}</h2>
      <p className="onboard-sub">{text.timeSub}</p>

      <div className="form-group">
        <label className="form-label">{text.trainingDays}</label>
        <input className="form-input" type="number" min={1} max={7} value={daysStr}
          onChange={event => setDaysStr(event.target.value)} />
      </div>

      {isMultiLocation ? (
        <>
          <p className="form-label" style={{ marginTop: 18 }}>
            🏠 {isHebrew ? 'זמן אימון בבית' : 'Home workout duration'}
          </p>
          <div className="option-grid col-4">
            {homeDurations.map(n => (
              <button type="button" key={`home-${n}`}
                className={`option-card compact${homeDuration === n ? ' selected' : ''}`}
                onClick={() => setHomeDuration(n)}>
                <span className="option-label">{durationLabel(n)}</span>
              </button>
            ))}
          </div>

          <p className="form-label" style={{ marginTop: 18 }}>
            🏋️ {isHebrew ? 'זמן אימון בחדר כושר' : 'Gym workout duration'}
          </p>
          <div className="option-grid col-3">
            {gymDurations.map(n => (
              <button type="button" key={`gym-${n}`}
                className={`option-card compact${gymDuration === n ? ' selected' : ''}`}
                onClick={() => setGymDuration(n)}>
                <span className="option-label">{durationLabel(n)}</span>
              </button>
            ))}
          </div>

          <p className="option-hint" style={{ marginTop: 10 }}>
            {isHebrew
              ? `🏠 ${homeDuration} דק׳ בבית · 🏋️ ${gymDuration} דק׳ בחדר כושר`
              : `🏠 ${homeDuration} min home · 🏋️ ${gymDuration} min gym`}
          </p>
        </>
      ) : (
        <>
          <p className="form-label">{text.timePerWorkout}</p>
          <div className="option-grid col-4">
            {durations.map(option => (
              <button type="button" key={option}
                className={`option-card compact${duration === option ? ' selected' : ''}`}
                onClick={() => setDuration(option)}>
                <span className="option-label">{durationLabel(option)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <NavButtons onBack={onBack}
        onSkip={() => isMultiLocation
          ? onSkip({ workout_days: 3, workout_time: 30, workoutDuration: 30, homeWorkoutDuration: 30, gymWorkoutDuration: 45 })
          : onSkip({ workout_days: 3, workout_time: 20, workoutDuration: 20 })} />
    </form>
  )
}

function StepEquipment({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const isHebrew = language === 'he'
  const text = copy[language]

  // Step 1 — where do you train?
  const [trainGym,  setTrainGym]  = useState(false)
  const [trainHome, setTrainHome] = useState(true)

  // Step 2 — home equipment (shown only when trainHome)
  const homeEquipOptions: Array<{ label: string; value: EquipmentOption }> = [
    { value: 'none',       label: text.equipmentNone },
    { value: 'dumbbells',  label: text.equipmentDumbbells },
    { value: 'bands',      label: text.equipmentBands },
    { value: 'pullup_bar', label: text.equipmentPullupBar },
  ]
  const [homeEquip, setHomeEquip] = useState<EquipmentOption[]>(['none'])

  const toggleHomeEquip = (value: EquipmentOption) => setHomeEquip(current => {
    if (value === 'none') return ['none']
    const without = current.filter(e => e !== 'none')
    return without.includes(value) ? without.filter(e => e !== value) : [...without, value]
  })

  const [smartWatch,     setSmartWatch]     = useState(false)
  const [smartScale,     setSmartScale]     = useState(false)
  const [cardioLocation, setCardioLocation] = useState(false)

  const canContinue = trainGym || trainHome

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      const equipment: EquipmentOption[] = trainGym
        ? trainHome ? ['gym', ...homeEquip.filter(e => e !== 'none')] : ['gym']
        : homeEquip
      const workoutTypes: UserProfile['workoutTypes'] = trainGym && trainHome
        ? ['gym', 'home']
        : trainGym ? ['gym'] : ['home']
      onNext({
        devices: { cardioLocation, smartScale, smartWatch },
        equipment,
        workoutType: workoutTypes[0],
        workoutTypes,
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{isHebrew ? 'איפה אתה מתאמן?' : 'Where do you train?'}</h2>
      <p className="onboard-sub">{isHebrew ? 'אפשר לסמן יותר ממקום אחד.' : 'You can select more than one.'}</p>

      {/* Location selector */}
      <div className="option-grid col-2" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`option-card${trainGym ? ' selected' : ''}`}
          onClick={() => setTrainGym(v => !v)}
        >
          <span className="option-label">🏋️ {isHebrew ? 'חדר כושר' : 'Gym'}</span>
          {trainGym && <span className="option-desc">{isHebrew ? '✓ נבחר' : '✓ Selected'}</span>}
        </button>
        <button
          type="button"
          className={`option-card${trainHome ? ' selected' : ''}`}
          onClick={() => setTrainHome(v => !v)}
        >
          <span className="option-label">🏠 {isHebrew ? 'בית' : 'Home'}</span>
          {trainHome && <span className="option-desc">{isHebrew ? '✓ נבחר' : '✓ Selected'}</span>}
        </button>
      </div>

      {/* Home equipment — only if training at home */}
      {trainHome && (
        <>
          <p className="form-label">{text.equipmentTitle}</p>
          <p className="option-hint">{text.equipmentSub}</p>
          <div className="option-grid col-3">
            {homeEquipOptions.map(opt => (
              <button
                type="button" key={opt.value}
                className={`option-card compact${homeEquip.includes(opt.value) ? ' selected' : ''}`}
                onClick={() => toggleHomeEquip(opt.value)}
              >
                <span className="option-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Smart devices */}
      <p className="form-label" style={{ marginTop: 16 }}>{language === 'he' ? 'חיבורים חכמים' : 'Smart connections'}</p>
      <p className="option-hint">
        {language === 'he' ? 'לא מחובר — ניתן להזין נתונים ידנית.' : 'Not connected — you can enter data manually.'}
      </p>
      <div className="option-grid col-3">
        <button type="button" className={`option-card compact${smartWatch ? ' selected' : ''}`} onClick={() => setSmartWatch(v => !v)}>
          <span className="option-label">{language === 'he' ? 'שעון חכם' : 'Smart watch'}</span>
        </button>
        <button type="button" className={`option-card compact${smartScale ? ' selected' : ''}`} onClick={() => setSmartScale(v => !v)}>
          <span className="option-label">{language === 'he' ? 'משקל חכם' : 'Smart scale'}</span>
        </button>
        <button type="button" className={`option-card compact${cardioLocation ? ' selected' : ''}`} onClick={() => setCardioLocation(v => !v)}>
          <span className="option-label">{language === 'he' ? 'מיקום לאירובי' : 'Cardio location'}</span>
        </button>
      </div>

      <NavButtons canContinue={canContinue} onBack={onBack} onSkip={() => onSkip({
        devices: { cardioLocation: false, smartScale: false, smartWatch: false },
        equipment: ['none'],
        workoutType: 'home',
        workoutTypes: ['home'],
      })} />
    </form>
  )
}

// ─── Weekly plan builder — rich version with muscle groups & durations ───────

const MIN_REST = 0
const MAX_REST = 3

const dayLabelHe: Record<WeekDay, string> = {
  sun: 'א׳', mon: 'ב׳', tue: 'ג׳', wed: 'ד׳', thu: 'ה׳', fri: 'ו׳', sat: 'ש׳',
}
const dayLabelEn: Record<WeekDay, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
}

// Per-day detail used only in the onboarding preview (not saved to profile)
type DayDetail = {
  focus: ScheduleFocus
  muscleHe: string
  muscleEn: string
  duration: number
  location: 'gym' | 'home' | 'rest'
}
type RichPlan = Record<WeekDay, DayDetail>

// ── Body part emphasis ────────────────────────────────────────────────────────
type BodyPart = 'chest' | 'back' | 'legs' | 'glutes' | 'shoulders' | 'arms' | 'core' | 'cardio'

type BodyPartDef = {
  icon: string
  labelHe: string
  labelEn: string
  muscleHe: string   // what appears in the plan row
  muscleEn: string
  focus: ScheduleFocus
}

const BODY_PARTS: Record<BodyPart, BodyPartDef> = {
  chest:     { icon: '💪', labelHe: 'חזה',     labelEn: 'Chest',     muscleHe: 'חזה + טריספס',         muscleEn: 'Chest + Triceps',       focus: 'goal'    },
  back:      { icon: '🔙', labelHe: 'גב',      labelEn: 'Back',      muscleHe: 'גב + ביספס',           muscleEn: 'Back + Biceps',         focus: 'back'    },
  legs:      { icon: '🦵', labelHe: 'רגליים',  labelEn: 'Legs',      muscleHe: 'רגליים + ישבן',        muscleEn: 'Legs + Glutes',         focus: 'legs'    },
  glutes:    { icon: '🍑', labelHe: 'ישבן',    labelEn: 'Glutes',    muscleHe: 'ישבן + ירכיים',        muscleEn: 'Glutes + Hamstrings',   focus: 'legs'    },
  shoulders: { icon: '🤸', labelHe: 'כתפיים', labelEn: 'Shoulders', muscleHe: 'כתפיים + טרפז',       muscleEn: 'Shoulders + Traps',     focus: 'arms'    },
  arms:      { icon: '🏋️', labelHe: 'ידיים',  labelEn: 'Arms',      muscleHe: 'ביספס + טריספס',      muscleEn: 'Biceps + Triceps',      focus: 'arms'    },
  core:      { icon: '🔥', labelHe: 'בטן',     labelEn: 'Core',      muscleHe: 'בטן + ליבה',           muscleEn: 'Core + Abs',            focus: 'abs'     },
  cardio:    { icon: '❤️', labelHe: 'אירובי',  labelEn: 'Cardio',    muscleHe: 'אירובי + סיבולת',      muscleEn: 'Cardio + Endurance',    focus: 'aerobic' },
}
const BODY_PART_KEYS = Object.keys(BODY_PARTS) as BodyPart[]

// ── Home body part emphasis ───────────────────────────────────────────────────
type HomeBodyPart = 'core' | 'cardio' | 'legs_bw' | 'back_bw' | 'upper_bw' | 'flexibility' | 'hiit' | 'full_bw'

type HomeBodyPartDef = {
  icon: string
  labelHe: string
  labelEn: string
  muscleHe: string
  muscleEn: string
  focus: ScheduleFocus
}

const HOME_BODY_PARTS: Record<HomeBodyPart, HomeBodyPartDef> = {
  core:        { icon: '🔥', labelHe: 'בטן',       labelEn: 'Core',        muscleHe: 'בטן + ליבה',            muscleEn: 'Core + Abs',          focus: 'abs'     },
  cardio:      { icon: '❤️', labelHe: 'אירובי',     labelEn: 'Cardio',      muscleHe: 'אירובי + סיבולת',       muscleEn: 'Cardio + Endurance',  focus: 'aerobic' },
  legs_bw:     { icon: '🦵', labelHe: 'רגליים',     labelEn: 'Legs',        muscleHe: 'רגליים - משקל גוף',     muscleEn: 'Legs - Bodyweight',   focus: 'legs'    },
  back_bw:     { icon: '🔙', labelHe: 'גב / מתח',   labelEn: 'Back / Bar',  muscleHe: 'גב - מתח וחתירה',       muscleEn: 'Back - Bar + Rows',   focus: 'back'    },
  upper_bw:    { icon: '💪', labelHe: 'פלג עליון',  labelEn: 'Upper Body',  muscleHe: 'פלג עליון - משקל גוף',  muscleEn: 'Upper Body - BW',     focus: 'goal'    },
  flexibility: { icon: '🤸', labelHe: 'גמישות',     labelEn: 'Flexibility', muscleHe: 'מתיחות + ניידות',        muscleEn: 'Stretch + Mobility',  focus: 'abs'     },
  hiit:        { icon: '⚡', labelHe: 'HIIT',        labelEn: 'HIIT',        muscleHe: 'HIIT + סיבולת',          muscleEn: 'HIIT + Endurance',    focus: 'aerobic' },
  full_bw:     { icon: '🏃', labelHe: 'גוף מלא',    labelEn: 'Full Body',   muscleHe: 'גוף מלא - משקל גוף',    muscleEn: 'Full Body - BW',      focus: 'goal'    },
}
const HOME_BODY_PART_KEYS = Object.keys(HOME_BODY_PARTS) as HomeBodyPart[]

// Fallback gym sequences per goal (used when no body parts selected)
const gymMusclesHe: Record<Goal, string[]> = {
  bulk:        ['חזה + טריספס', 'גב + ביספס', 'רגליים + ישבן', 'כתפיים + טרפז', 'גוף מלא'],
  cut:         ['גוף מלא', 'רגליים + בטן', 'פלג גוף עליון', 'אירובי + ליבה'],
  endurance:   ['אירובי + חיזוק', 'רגליים + סיבולת', 'פלג גוף עליון'],
  flexibility: ['מתיחות + ליבה', 'יוגה + גוף מלא', 'ניידות'],
  fitness:     ['פלג גוף עליון', 'פלג גוף תחתון', 'גוף מלא', 'כתפיים + בטן'],
  health:      ['גוף מלא', 'אירובי + חיזוק', 'פלג גוף עליון'],
  consistency: ['גוף מלא', 'פלג גוף עליון', 'פלג גוף תחתון'],
}
const gymMusclesEn: Record<Goal, string[]> = {
  bulk:        ['Chest + Triceps', 'Back + Biceps', 'Legs + Glutes', 'Shoulders + Traps', 'Full Body'],
  cut:         ['Full Body', 'Legs + Core', 'Upper Body', 'Cardio + Core'],
  endurance:   ['Cardio + Strength', 'Legs + Endurance', 'Upper Body'],
  flexibility: ['Stretch + Core', 'Yoga + Full Body', 'Mobility'],
  fitness:     ['Upper Body', 'Lower Body', 'Full Body', 'Shoulders + Core'],
  health:      ['Full Body', 'Cardio + Strength', 'Upper Body'],
  consistency: ['Full Body', 'Upper Body', 'Lower Body'],
}

// Home workout sequences per goal
const homeMusclesHe: Record<Goal, string[]> = {
  bulk:        ['גוף מלא - משקל גוף', 'גב - מתח וחתירה', 'בטן + ליבה', 'פלג גוף עליון - משקל גוף'],
  cut:         ['HIIT', 'בטן + ליבה', 'אירובי', 'HIIT + בטן'],
  endurance:   ['ריצה / אירובי', 'HIIT', 'בטן + נשימה'],
  flexibility: ['יוגה', 'מתיחות מלאות', 'פילאטיס'],
  fitness:     ['אירובי', 'גב - מתח וחתירה', 'בטן + ליבה', 'גוף מלא - משקל גוף'],
  health:      ['הליכה / ריצה קלה', 'בטן + מתיחות', 'גוף מלא קל'],
  consistency: ['בטן + ליבה', 'אירובי', 'גוף מלא - משקל גוף'],
}
const homeMusclesEn: Record<Goal, string[]> = {
  bulk:        ['Full Body - Bodyweight', 'Back - Bar + Rows', 'Abs + Core', 'Upper Body - Bodyweight'],
  cut:         ['HIIT', 'Abs + Core', 'Cardio', 'HIIT + Abs'],
  endurance:   ['Run / Cardio', 'HIIT', 'Abs + Breathing'],
  flexibility: ['Yoga', 'Full Stretch', 'Pilates'],
  fitness:     ['Cardio', 'Back - Bar + Rows', 'Abs + Core', 'Full Body - Bodyweight'],
  health:      ['Walk / Light Jog', 'Abs + Stretch', 'Light Full Body'],
  consistency: ['Abs + Core', 'Cardio', 'Full Body - Bodyweight'],
}
const homeFocuses: Record<Goal, ScheduleFocus[]> = {
  bulk: ['goal','back','abs','goal'], cut: ['aerobic','abs','aerobic','aerobic'],
  endurance: ['aerobic','aerobic','abs'], flexibility: ['abs','abs','abs'],
  fitness: ['aerobic','back','abs','goal'], health: ['aerobic','abs','goal'],
  consistency: ['abs','aerobic','goal'],
}

function buildRichPlan(
  restDays: WeekDay[],
  gymDays: WeekDay[],
  goals: Goal[],
  _level: FitnessLevel,
  gymDur: number,
  homeDur: number,
  hasGym: boolean,
  hasHome: boolean,
  gymParts: BodyPart[],
  homeParts: HomeBodyPart[],
): { rich: RichPlan; simple: WeeklyPlan } {
  const primaryGoal = goals[0] ?? 'fitness'
  const restSet = new Set(restDays)
  const gymSet  = new Set(gymDays)
  const rich   = {} as RichPlan
  const simple = {} as WeeklyPlan

  // Build gym queue from selected gym body parts, or fall back to goal-based sequence
  const gymQueue: Array<{ muscleHe: string; muscleEn: string; focus: ScheduleFocus }> =
    gymParts.length > 0
      ? gymParts.map(p => BODY_PARTS[p])
      : gymMusclesHe[primaryGoal].map((mHe, i) => ({
          muscleHe: mHe,
          muscleEn: gymMusclesEn[primaryGoal][i],
          focus: ((): ScheduleFocus => {
            if (mHe.includes('רגל') || mHe.includes('ישבן') || mHe.includes('ירכ')) return 'legs'
            if (mHe.includes('גב')) return 'back'
            if (mHe.includes('בטן') || mHe.includes('ליבה')) return 'abs'
            if (mHe.includes('אירובי')) return 'aerobic'
            if (mHe.includes('ידי') || mHe.includes('כתפ') || mHe.includes('ביספ') || mHe.includes('טריספ')) return 'arms'
            return 'goal'
          })(),
        }))

  // Build home queue from selected home body parts, or fall back to goal-based sequence
  const homeQueue: Array<{ muscleHe: string; muscleEn: string; focus: ScheduleFocus }> =
    homeParts.length > 0
      ? homeParts.map(p => HOME_BODY_PARTS[p])
      : homeMusclesHe[primaryGoal].map((mHe, i) => ({
          muscleHe: mHe,
          muscleEn: homeMusclesEn[primaryGoal][i],
          focus: homeFocuses[primaryGoal][i % homeFocuses[primaryGoal].length],
        }))

  let gymIdx = 0, homeIdx = 0

  WEEK_DAYS.forEach(day => {
    if (restSet.has(day)) {
      rich[day]   = { focus: 'rest', muscleHe: 'מנוחה', muscleEn: 'Rest', duration: 0, location: 'rest' }
      simple[day] = 'rest'
      return
    }
    if (gymSet.has(day) || (hasGym && !hasHome)) {
      const q = gymQueue[gymIdx % gymQueue.length]
      rich[day]   = { focus: q.focus, muscleHe: q.muscleHe, muscleEn: q.muscleEn, duration: gymDur, location: 'gym' }
      simple[day] = q.focus
      gymIdx++
    } else {
      const q = homeQueue[homeIdx % homeQueue.length]
      rich[day]   = { focus: q.focus, muscleHe: q.muscleHe, muscleEn: q.muscleEn, duration: homeDur, location: 'home' }
      simple[day] = q.focus
      homeIdx++
    }
  })
  return { rich, simple }
}

function StepWeeklyPlan({ data, onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const isHebrew = language === 'he'

  const hasGym  = (data.workoutTypes ?? []).includes('gym')
  const hasHome = (data.workoutTypes ?? []).includes('home')
  const goals: Goal[]       = data.goals?.length ? data.goals : ['fitness']
  const level: FitnessLevel = data.fitnessLevel ?? data.level ?? 'beginner'

  // Durations from StepTime
  const gymDur  = (data as { gymWorkoutDuration?: number }).gymWorkoutDuration  ?? data.workoutDuration ?? 45
  const homeDur = (data as { homeWorkoutDuration?: number }).homeWorkoutDuration ?? data.workoutDuration ?? 30

  const [gymParts,  setGymParts]  = useState<BodyPart[]>([])
  const [homeParts, setHomeParts] = useState<HomeBodyPart[]>([])
  const [restDays, setRestDays] = useState<WeekDay[]>(['fri', 'sat'])
  const [gymFreq, setGymFreq]   = useState(3)
  const [gymDays, setGymDays]   = useState<WeekDay[]>([])
  const [richPlan, setRichPlan] = useState<RichPlan | null>(null)
  const [simplePlan, setSimplePlan] = useState<WeeklyPlan | null>(null)

  const toggleGymPart = (p: BodyPart) => {
    setRichPlan(null)
    setGymParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const toggleHomePart = (p: HomeBodyPart) => {
    setRichPlan(null)
    setHomeParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const activeDays  = WEEK_DAYS.length - restDays.length
  const canGenerate = restDays.length >= MIN_REST && restDays.length <= MAX_REST

  const toggleRest = (day: WeekDay) => {
    setRichPlan(null)
    setRestDays(prev => {
      if (prev.includes(day)) return prev.filter(d => d !== day)
      if (prev.length >= MAX_REST) return prev
      return [...prev, day]
    })
    setGymDays(prev => prev.filter(d => d !== day))
  }

  const toggleGym = (day: WeekDay) => {
    if (restDays.includes(day)) return
    setRichPlan(null)
    setGymDays(prev => {
      if (prev.includes(day)) return prev.filter(d => d !== day)
      if (prev.length >= gymFreq) return prev
      return [...prev, day]
    })
  }

  const handleGenerate = () => {
    const { rich, simple } = buildRichPlan(
      restDays, gymDays, goals, level, gymDur, homeDur, hasGym, hasHome, gymParts, homeParts,
    )
    setRichPlan(rich)
    setSimplePlan(simple)
  }

  const dayLabel = (d: WeekDay) => isHebrew ? dayLabelHe[d] : dayLabelEn[d]

  const locationColor = (loc: DayDetail['location']) =>
    loc === 'gym' ? '#22c55e' : loc === 'home' ? '#3b82f6' : '#475569'

  const defaultSimple = (): WeeklyPlan => {
    const { simple } = buildRichPlan(['fri','sat'], [], goals, level, gymDur, homeDur, hasGym, hasHome, [], [])
    return simple
  }

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ weeklyPlan: simplePlan!, gymDays })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{isHebrew ? 'תוכנית שבועית' : 'Weekly plan'}</h2>
      <p className="onboard-sub">
        {isHebrew
          ? 'בחר ימי מנוחה ונבנה תוכנית מעורבבת עם קבוצות שרירים שונות.'
          : 'Pick rest days — we\'ll build a mixed plan with different muscle groups.'}
      </p>

      {/* Gym body part emphasis — only shown for gym users */}
      {hasGym && (
        <>
          <p className="form-label">🏋️ {isHebrew ? 'דגש בחדר כושר' : 'Gym emphasis'}</p>
          <p className="option-hint" style={{ marginBottom: 10 }}>
            {isHebrew ? 'בחר שרירים לדגש בחדר כושר.' : 'Pick muscle groups to focus on at the gym.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {BODY_PART_KEYS.map(key => {
              const def = BODY_PARTS[key]
              const active = gymParts.includes(key)
              return (
                <button
                  type="button" key={key}
                  onClick={() => toggleGymPart(key)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
                    background: active ? '#22c55e' : 'rgba(255,255,255,0.09)',
                    color: active ? '#000' : 'rgba(255,255,255,0.65)',
                    boxShadow: active ? '0 0 0 2px #86efac' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{def.icon}</span>
                  <span>{isHebrew ? def.labelHe : def.labelEn}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Home body part emphasis — only shown for home users */}
      {hasHome && (
        <>
          <p className="form-label">🏠 {isHebrew ? 'דגש בבית' : 'Home emphasis'}</p>
          <p className="option-hint" style={{ marginBottom: 10 }}>
            {isHebrew ? 'בחר שרירים לדגש באימון בבית.' : 'Pick muscle groups to focus on at home.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {HOME_BODY_PART_KEYS.map(key => {
              const def = HOME_BODY_PARTS[key]
              const active = homeParts.includes(key)
              return (
                <button
                  type="button" key={key}
                  onClick={() => toggleHomePart(key)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
                    background: active ? '#3b82f6' : 'rgba(255,255,255,0.09)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                    boxShadow: active ? '0 0 0 2px #93c5fd' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{def.icon}</span>
                  <span>{isHebrew ? def.labelHe : def.labelEn}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Rest days */}
      <p className="form-label">{isHebrew ? 'ימי מנוחה (אופציונלי, עד 3)' : 'Rest days (optional, up to 3)'}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {WEEK_DAYS.map(day => (
          <button
            type="button" key={day}
            onClick={() => toggleRest(day)}
            style={{
              padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: restDays.includes(day) ? '#7c3aed' : 'rgba(255,255,255,0.1)',
              color: restDays.includes(day) ? '#fff' : 'rgba(255,255,255,0.6)',
              opacity: !restDays.includes(day) && restDays.length >= MAX_REST ? 0.4 : 1,
            }}
            disabled={!restDays.includes(day) && restDays.length >= MAX_REST}
          >
            {dayLabel(day)}
          </button>
        ))}
      </div>
      {restDays.length >= MAX_REST && (
        <p className="option-hint" style={{ fontSize: 12, marginBottom: 8 }}>
          {isHebrew ? 'הגעת למקסימום ימי מנוחה (3)' : 'Maximum rest days reached (3)'}
        </p>
      )}

      {/* Gym days section — only if user has gym */}
      {hasGym && (
        <>
          <p className="form-label" style={{ marginTop: 16 }}>
            {isHebrew ? 'כמה פעמים בשבוע חדר כושר?' : 'Gym sessions per week?'}
          </p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[2,3,4,5,6].filter(n => n <= activeDays).map(n => (
              <button
                type="button" key={n}
                onClick={() => { setGymFreq(n); setGymDays(prev => prev.slice(0, n)); setRichPlan(null) }}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14,
                  background: gymFreq === n ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  color: gymFreq === n ? '#000' : '#fff',
                }}
              >{n}×</button>
            ))}
          </div>

          <p className="form-label">
            {isHebrew
              ? `באילו ימים? (${gymDays.length}/${gymFreq} נבחרו)`
              : `Which days? (${gymDays.length}/${gymFreq} selected)`}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {WEEK_DAYS.map(day => {
              const isRest = restDays.includes(day)
              const isGym  = gymDays.includes(day)
              const maxed  = gymDays.length >= gymFreq && !isGym
              return (
                <button type="button" key={day} disabled={isRest || maxed}
                  onClick={() => toggleGym(day)}
                  style={{
                    padding: '8px 12px', borderRadius: 10, border: 'none',
                    cursor: isRest || maxed ? 'default' : 'pointer',
                    fontWeight: 700, fontSize: 13,
                    background: isRest ? 'rgba(255,255,255,0.05)'
                      : isGym ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    color: isRest ? 'rgba(255,255,255,0.25)'
                      : isGym ? '#000' : 'rgba(255,255,255,0.6)',
                    opacity: maxed ? 0.4 : 1,
                  }}
                >
                  {dayLabel(day)} {isRest ? '😴' : isGym ? '🏋️' : hasHome ? '🏠' : ''}
                </button>
              )
            })}
          </div>

          {/* Duration legend */}
          <p className="option-hint" style={{ marginBottom: 0 }}>
            🏋️ {gymDur}{isHebrew ? ' דק׳' : ' min'}
            {hasHome && <> &nbsp;·&nbsp; 🏠 {homeDur}{isHebrew ? ' דק׳' : ' min'}</>}
          </p>
        </>
      )}

      {/* Generate button */}
      <button
        type="button" className="btn-primary" disabled={!canGenerate}
        onClick={handleGenerate}
        style={{ marginTop: 16, width: '100%' }}
      >
        {isHebrew ? '⚡ צור תוכנית מותאמת' : '⚡ Build my plan'}
      </button>

      {/* Rich plan preview */}
      {richPlan && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p className="form-label" style={{ marginBottom: 4 }}>
            {isHebrew ? 'התוכנית שלך:' : 'Your plan:'}
          </p>
          {WEEK_DAYS.map(day => {
            const d = richPlan[day]
            const locColor = locationColor(d.location)
            return (
              <div key={day} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 12,
                background: d.location === 'rest'
                  ? 'rgba(255,255,255,0.03)'
                  : d.location === 'gym'
                  ? 'rgba(34,197,94,0.07)'
                  : 'rgba(59,130,246,0.07)',
                border: `1px solid ${locColor}22`,
              }}>
                {/* Left: day + location icon */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
                    {dayLabel(day)}&nbsp;
                    {d.location === 'gym'  && '🏋️'}
                    {d.location === 'home' && '🏠'}
                    {d.location === 'rest' && '😴'}
                  </span>
                  {d.location !== 'rest' && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      {isHebrew ? d.muscleHe : d.muscleEn}
                    </span>
                  )}
                </div>
                {/* Right: duration pill */}
                {d.location !== 'rest' ? (
                  <span style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                    background: locColor + '22', color: locColor, border: `1px solid ${locColor}44`,
                    whiteSpace: 'nowrap',
                  }}>
                    {d.duration} {isHebrew ? 'דק׳' : 'min'}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {isHebrew ? 'מנוחה' : 'Rest'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <NavButtons
        canContinue={!!richPlan}
        onBack={onBack}
        onSkip={() => onSkip({ weeklyPlan: defaultSimple(), gymDays: [] })}
      />
    </form>
  )
}

function StepNutrition({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language, isHebrew } = useI18n()
  const text = copy[language]
  const [eatsRegularly, setEatsRegularly] = useState(true)
  const [mealsStr, setMealsStr] = useState('3')
  const [likedFoods, setLikedFoods] = useState('')
  const [avoidedFoods, setAvoidedFoods] = useState('')
  const [sensitivities, setSensitivities] = useState('')
  const [dietTypes, setDietTypes] = useState<DietType[]>([])

  const dietTypeOptions: Array<{ label: string; value: DietType }> = [
    { value: 'vegetarian', label: isHebrew ? '🥗 צמחוני' : '🥗 Vegetarian' },
    { value: 'vegan',      label: isHebrew ? '🌱 טבעוני' : '🌱 Vegan' },
    { value: 'kosher',     label: isHebrew ? '✡️ כשר' : '✡️ Kosher' },
    { value: 'gluten-free', label: isHebrew ? '🌾 ללא גלוטן' : '🌾 Gluten-free' },
    { value: 'dairy-free', label: isHebrew ? '🥛 ללא חלב' : '🥛 Dairy-free' },
    { value: 'nut-free',   label: isHebrew ? '🥜 ללא אגוזים' : '🥜 Nut-free' },
  ]

  const toggleDietType = (dt: DietType) =>
    setDietTypes(prev => prev.includes(dt) ? prev.filter(x => x !== dt) : [...prev, dt])

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({
        nutrition: {
          avoidedFoods: avoidedFoods.trim(),
          dietTypes: dietTypes.length > 0 ? dietTypes : undefined,
          eatsRegularly,
          likedFoods: likedFoods.trim(),
          mealsPerDay: sanitizeNumber(mealsStr, 3, 1, 8),
          sensitivities: sensitivities.trim(),
        },
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.nutritionTitle}</h2>
      <p className="onboard-sub">{text.nutritionSub}</p>

      {/* Eats regularly? */}
      <p className="form-label">{isHebrew ? 'אתה אוכל בסדר יום קבוע?' : 'Do you eat on a regular schedule?'}</p>
      <div className="option-grid col-2">
        <button type="button" className={`option-card compact${eatsRegularly ? ' selected' : ''}`} onClick={() => setEatsRegularly(true)}><span className="option-label">{text.nutritionYes}</span></button>
        <button type="button" className={`option-card compact${!eatsRegularly ? ' selected' : ''}`} onClick={() => setEatsRegularly(false)}><span className="option-label">{text.nutritionNo}</span></button>
      </div>

      {/* Diet types */}
      <p className="form-label" style={{ marginTop: 16 }}>
        {isHebrew ? 'העדפות תזונה (אפשר לבחור כמה)' : 'Diet preferences (pick all that apply)'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {dietTypeOptions.map(opt => (
          <button
            type="button" key={opt.value}
            onClick={() => toggleDietType(opt.value)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: dietTypes.includes(opt.value) ? '#7c3aed' : 'rgba(255,255,255,0.09)',
              color: dietTypes.includes(opt.value) ? '#fff' : 'rgba(255,255,255,0.65)',
              boxShadow: dietTypes.includes(opt.value) ? '0 0 0 2px #a78bfa' : 'none',
            }}
          >{opt.label}</button>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">{text.mealsPerDay}</label>
        <input className="form-input" type="number" min={1} max={8} value={mealsStr} onChange={event => setMealsStr(event.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">{isHebrew ? 'מזונות אהובים' : 'Liked foods'}</label>
        <input className="form-input" value={likedFoods} onChange={event => setLikedFoods(event.target.value)} maxLength={180} />
      </div>
      <div className="form-group">
        <label className="form-label">{isHebrew ? 'מזונות שאתה לא אוכל' : 'Foods to avoid'}</label>
        <input className="form-input" value={avoidedFoods} onChange={event => setAvoidedFoods(event.target.value)} maxLength={180} />
      </div>
      <div className="form-group">
        <label className="form-label">{isHebrew ? 'רגישויות ואלרגיות' : 'Allergies / sensitivities'}</label>
        <input className="form-input" value={sensitivities} onChange={event => setSensitivities(event.target.value)} maxLength={180} />
      </div>
      <NavButtons onBack={onBack} onSkip={() => onSkip({ nutrition: { eatsRegularly: true, mealsPerDay: 3 } })} />
    </form>
  )
}

function StepHealth({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language, isHebrew } = useI18n()
  const text = copy[language]
  const [hasPainOrInjuries, setHasPainOrInjuries] = useState(false)
  const [sensitiveAreas, setSensitiveAreas] = useState<SensitiveArea[]>([])
  const [painIntensity, setPainIntensity] = useState<Partial<Record<SensitiveArea, PainIntensity>>>({})
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium')
  const [sleepStr, setSleepStr] = useState('7')

  const areaOptions: Array<{ icon: string; label: string; value: SensitiveArea }> = [
    { value: 'back',      icon: '🔙', label: isHebrew ? 'גב'       : 'Back'      },
    { value: 'knees',     icon: '🦵', label: isHebrew ? 'ברכיים'   : 'Knees'     },
    { value: 'shoulders', icon: '🤸', label: isHebrew ? 'כתפיים'   : 'Shoulders' },
    { value: 'neck',      icon: '🦒', label: isHebrew ? 'צוואר'    : 'Neck'      },
    { value: 'elbows',    icon: '💪', label: isHebrew ? 'מרפקים'   : 'Elbows'    },
    { value: 'hips',      icon: '🍑', label: isHebrew ? 'ירכיים'   : 'Hips'      },
    { value: 'ankles',    icon: '🦶', label: isHebrew ? 'קרסוליים' : 'Ankles'    },
  ]

  const intensityOptions: Array<{ color: string; label: string; value: PainIntensity }> = [
    { value: 'mild',     color: '#22c55e', label: isHebrew ? 'קל'      : 'Mild'     },
    { value: 'moderate', color: '#f59e0b', label: isHebrew ? 'בינוני'  : 'Moderate' },
    { value: 'severe',   color: '#ef4444', label: isHebrew ? 'חמור'    : 'Severe'   },
  ]

  const toggleArea = (value: SensitiveArea) => {
    setSensitiveAreas(current => {
      if (current.includes(value)) {
        setPainIntensity(prev => { const next = { ...prev }; delete next[value]; return next })
        return current.filter(item => item !== value)
      }
      return [...current, value]
    })
  }

  const setIntensity = (area: SensitiveArea, intensity: PainIntensity) =>
    setPainIntensity(prev => ({ ...prev, [area]: intensity }))

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({
        health: {
          energyLevel,
          hasPainOrInjuries,
          painIntensity: Object.keys(painIntensity).length > 0 ? painIntensity : undefined,
          sensitiveAreas,
          sleepHours: sanitizeNumber(sleepStr, 7, 0, 14),
        },
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.healthTitle}</h2>
      <p className="onboard-sub">{text.healthSub}</p>

      {/* Pain / injuries toggle */}
      <div className="option-grid col-2">
        <button type="button" className={`option-card compact${!hasPainOrInjuries ? ' selected' : ''}`} onClick={() => setHasPainOrInjuries(false)}><span className="option-label">{text.injuriesNo}</span></button>
        <button type="button" className={`option-card compact${hasPainOrInjuries ? ' selected' : ''}`} onClick={() => setHasPainOrInjuries(true)}><span className="option-label">{text.injuriesYes}</span></button>
      </div>
      {hasPainOrInjuries && <p className="option-hint warning-text" style={{ marginTop: 8 }}>{text.painWarning}</p>}

      {/* Sensitive areas */}
      <p className="form-label" style={{ marginTop: 16 }}>
        {isHebrew ? 'אזורים רגישים (בחר אם יש)' : 'Sensitive areas (if any)'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {areaOptions.map(opt => (
          <button
            type="button" key={opt.value}
            onClick={() => toggleArea(opt.value)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 5,
              background: sensitiveAreas.includes(opt.value) ? '#ef4444' : 'rgba(255,255,255,0.09)',
              color: sensitiveAreas.includes(opt.value) ? '#fff' : 'rgba(255,255,255,0.65)',
              boxShadow: sensitiveAreas.includes(opt.value) ? '0 0 0 2px #fca5a5' : 'none',
            }}
          >
            <span>{opt.icon}</span><span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Intensity per selected area */}
      {sensitiveAreas.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-label">{isHebrew ? 'עצימות הכאב לכל אזור:' : 'Pain intensity per area:'}</p>
          {sensitiveAreas.map(area => {
            const def = areaOptions.find(o => o.value === area)!
            return (
              <div key={area} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px',
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13 }}>
                  {def.icon} {def.label}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {intensityOptions.map(iopt => (
                    <button
                      type="button" key={iopt.value}
                      onClick={() => setIntensity(area, iopt.value)}
                      style={{
                        padding: '5px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 12,
                        background: painIntensity[area] === iopt.value ? iopt.color : 'rgba(255,255,255,0.1)',
                        color: painIntensity[area] === iopt.value ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}
                    >{iopt.label}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Energy level */}
      <p className="form-label" style={{ marginTop: 20 }}>{isHebrew ? 'רמת אנרגיה כללית' : 'General energy level'}</p>
      <div className="option-grid col-3">
        {([
          ['low', text.energyLow],
          ['medium', text.energyMedium],
          ['high', text.energyHigh],
        ] as Array<[EnergyLevel, string]>).map(([value, label]) => (
          <button type="button" key={value} className={`option-card compact${energyLevel === value ? ' selected' : ''}`} onClick={() => setEnergyLevel(value)}><span className="option-label">{label}</span></button>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">{text.sleepHours}</label>
        <input className="form-input" type="number" min={0} max={14} value={sleepStr} onChange={event => setSleepStr(event.target.value)} />
      </div>
      <NavButtons onBack={onBack} onSkip={() => onSkip({ health: { energyLevel: 'medium', hasPainOrInjuries: false, sensitiveAreas: [], sleepHours: 7 } })} />
    </form>
  )
}

function StepHabits({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language, isHebrew } = useI18n()
  const text = copy[language]
  const [dailyActivity, setDailyActivity] = useState<DailyActivityLevel>('medium')
  const [fixedWorkoutTime, setFixedWorkoutTime] = useState(false)
  const [hardestPart, setHardestPart] = useState<HabitChallenge>('consistency')
  const [workoutTimePreference, setWorkoutTimePreference] = useState<WorkoutTimePreference>('morning')

  const timeOptions: Array<{ icon: string; label: string; sub: string; value: WorkoutTimePreference }> = [
    { value: 'morning', icon: '🌅', label: isHebrew ? 'בוקר' : 'Morning', sub: isHebrew ? '06:00–10:00' : '6–10 AM' },
    { value: 'noon',    icon: '☀️', label: isHebrew ? 'צהריים' : 'Noon',   sub: isHebrew ? '10:00–14:00' : '10 AM–2 PM' },
    { value: 'evening', icon: '🌙', label: isHebrew ? 'ערב' : 'Evening',   sub: isHebrew ? '17:00–21:00' : '5–9 PM' },
  ]

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ habits: { dailyActivity, fixedWorkoutTime, hardestPart, workoutTimePreference } })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.habitsTitle}</h2>
      <p className="onboard-sub">{text.habitsSub}</p>

      <p className="form-label">{isHebrew ? 'כמה אתה פעיל ביום רגיל?' : 'How active are you on a regular day?'}</p>
      <div className="option-grid col-3">
        {([
          ['low', text.activityLow],
          ['medium', text.activityMedium],
          ['high', text.activityHigh],
        ] as Array<[DailyActivityLevel, string]>).map(([value, label]) => (
          <button type="button" key={value} className={`option-card compact${dailyActivity === value ? ' selected' : ''}`} onClick={() => setDailyActivity(value)}><span className="option-label">{label}</span></button>
        ))}
      </div>

      <p className="form-label" style={{ marginTop: 18 }}>
        {isHebrew ? 'באיזה זמן ביום אתה מעדיף להתאמן?' : 'When do you prefer to work out?'}
      </p>
      <div className="option-grid col-3">
        {timeOptions.map(opt => (
          <button
            type="button" key={opt.value}
            className={`option-card${workoutTimePreference === opt.value ? ' selected' : ''}`}
            onClick={() => setWorkoutTimePreference(opt.value)}
            style={{ padding: '12px 10px' }}
          >
            <span style={{ fontSize: 22 }}>{opt.icon}</span>
            <span className="option-label" style={{ marginTop: 4 }}>{opt.label}</span>
            <span className="option-desc">{opt.sub}</span>
          </button>
        ))}
      </div>

      <p className="form-label" style={{ marginTop: 18 }}>{isHebrew ? 'יש זמן קבוע לאימון?' : 'Do you have a fixed workout time?'}</p>
      <div className="option-grid col-2">
        <button type="button" className={`option-card compact${fixedWorkoutTime ? ' selected' : ''}`} onClick={() => setFixedWorkoutTime(true)}><span className="option-label">{text.fixedYes}</span></button>
        <button type="button" className={`option-card compact${!fixedWorkoutTime ? ' selected' : ''}`} onClick={() => setFixedWorkoutTime(false)}><span className="option-label">{text.fixedNo}</span></button>
      </div>

      <p className="form-label" style={{ marginTop: 18 }}>{isHebrew ? 'מה הכי קשה לך?' : 'What is the hardest part for you?'}</p>
      <div className="option-grid col-2">
        {([
          ['start', text.hardestStart],
          ['consistency', text.hardestConsistency],
          ['time', text.hardestTime],
          ['motivation', text.hardestMotivation],
        ] as Array<[HabitChallenge, string]>).map(([value, label]) => (
          <button type="button" key={value} className={`option-card compact${hardestPart === value ? ' selected' : ''}`} onClick={() => setHardestPart(value)}><span className="option-label">{label}</span></button>
        ))}
      </div>

      <NavButtons finish onBack={onBack} onSkip={() => onSkip({ habits: { dailyActivity: 'medium', fixedWorkoutTime: false, hardestPart: 'consistency', workoutTimePreference: 'morning' } })} />
    </form>
  )
}

function ReminderDayPicker({
  days,
  labels,
  onToggle,
  color = '#7c3aed',
}: {
  days: number[]
  labels: string[]
  onToggle: (d: number) => void
  color?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      {labels.map((label, i) => (
        <button
          key={i} type="button"
          onClick={() => onToggle(i)}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: days.includes(i) ? color : 'rgba(255,255,255,0.1)',
            color: days.includes(i) ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        >{label}</button>
      ))}
    </div>
  )
}

function StepReminders({ data, onBack, onNext, step, total }: StepProps) {
  const { language } = useI18n()
  const isHebrew = language === 'he'

  // Convert WeekDay strings → day indices (0=Sun … 6=Sat)
  const gymDayIndices = (data.gymDays ?? [])
    .map(day => WEEK_DAYS.indexOf(day as WeekDay))
    .filter(i => i >= 0)
  const hasGymDays = gymDayIndices.length > 0

  // Default general reminder time from workout time preference
  const defaultTimeFromPref = (): string => {
    const pref = data.habits?.workoutTimePreference
    if (pref === 'morning') return '07:00'
    if (pref === 'noon')    return '12:00'
    if (pref === 'evening') return '18:00'
    return '08:00'
  }

  // Default general reminder days = all workout days (non-rest)
  const defaultReminderDays = (): number[] => {
    const plan = data.weeklyPlan
    if (!plan) return [0, 1, 2, 3, 4]
    return WEEK_DAYS
      .map((day, i) => ({ day, i }))
      .filter(({ day }) => plan[day as WeekDay] !== 'rest')
      .map(({ i }) => i)
  }

  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )

  // ── Sound preference ──────────────────────────────────────────────────────
  const [withSound, setWithSound] = useState(true)

  // ── General reminder ──────────────────────────────────────────────────────
  const [wantReminder, setWantReminder]   = useState(true)
  const [time, setTime]                   = useState(defaultTimeFromPref)
  const [days, setDays]                   = useState<number[]>(defaultReminderDays)
  const [saved, setSaved]                 = useState(false)

  // ── Gym-specific reminder (shown only when user configured gym days) ───────
  const [wantGymReminder, setWantGymReminder] = useState(hasGymDays)
  const [gymTime, setGymTime]                 = useState(defaultTimeFromPref)
  const [gymDays, setGymDays]                 = useState<number[]>(gymDayIndices)
  const [gymSaved, setGymSaved]               = useState(false)

  const dayLabels = isHebrew ? DAY_LABELS_HE : DAY_LABELS_EN

  const toggleDay    = (d: number) => setDays(prev    => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  const toggleGymDay = (d: number) => setGymDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  const handlePermission = async () => {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
  }

  const handleSave = async () => {
    if (!wantReminder || days.length === 0) return
    saveReminder(createReminder({
      label: isHebrew ? 'תזכורת אימון' : 'Workout reminder',
      time, days, repeat: true, sound: withSound, enabled: true,
    }))
    await syncScheduledReminders(isHebrew)
    setSaved(true)
  }

  const handleSaveGym = async () => {
    if (!wantGymReminder || gymDays.length === 0) return
    saveReminder(createReminder({
      label: isHebrew ? 'תזכורת אימון חדר כושר 🏋️' : 'Gym workout reminder 🏋️',
      time: gymTime, days: gymDays, repeat: true, sound: withSound, enabled: true,
    }))
    await syncScheduledReminders(isHebrew)
    setGymSaved(true)
  }

  return (
    <div className="onboard-step">
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">⏰ {isHebrew ? 'תזכורות אימון' : 'Workout reminders'}</h2>
      <p className="onboard-sub">
        {isHebrew ? 'קבל תזכורות לפני כל אימון.' : 'Get reminders before each workout.'}
      </p>

      {/* Permission banner */}
      {!notifGranted && (
        <div style={{
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>
            🔔 {isHebrew ? 'אפשר התראות' : 'Enable notifications'}
          </p>
          <button className="btn-primary" type="button" onClick={handlePermission}>
            {isHebrew ? 'אפשר' : 'Allow'}
          </button>
        </div>
      )}

      {/* ── Sound toggle ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p className="form-label" style={{ marginBottom: 10 }}>
          {isHebrew ? '🔊 צליל התראה' : '🔊 Notification sound'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button"
            className={`option-card compact${withSound ? ' selected' : ''}`}
            style={{ flex: 1 }} onClick={() => setWithSound(true)}
          >
            <span className="option-label">🔔 {isHebrew ? 'עם צליל' : 'With sound'}</span>
          </button>
          <button type="button"
            className={`option-card compact${!withSound ? ' selected' : ''}`}
            style={{ flex: 1 }} onClick={() => setWithSound(false)}
          >
            <span className="option-label">🔕 {isHebrew ? 'שקט' : 'Silent'}</span>
          </button>
        </div>
      </div>

      {/* ── General workout reminder ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p className="form-label" style={{ marginBottom: 10 }}>
          {hasGymDays
            ? (isHebrew ? '🏠 תזכורת אימון כללית (בית / חוץ)' : '🏠 General reminder (home / outdoor)')
            : (isHebrew ? 'תזכורת אימון' : 'Workout reminder')}
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button type="button"
            className={`option-card compact${wantReminder ? ' selected' : ''}`}
            style={{ flex: 1 }} onClick={() => setWantReminder(true)}
          >
            <span className="option-label">✅ {isHebrew ? 'כן, תזכיר לי' : 'Yes, remind me'}</span>
          </button>
          <button type="button"
            className={`option-card compact${!wantReminder ? ' selected' : ''}`}
            style={{ flex: 1 }} onClick={() => setWantReminder(false)}
          >
            <span className="option-label">🚫 {isHebrew ? 'לא תודה' : 'No thanks'}</span>
          </button>
        </div>

        {wantReminder && (
          <>
            <p className="form-label">{isHebrew ? 'שעת התזכורת' : 'Reminder time'}</p>
            <input
              type="time" value={time}
              onChange={e => { setTime(e.target.value); setSaved(false) }}
              style={{
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)', color: '#fff',
                padding: '10px 14px', fontSize: 18, marginBottom: 18, width: 140,
              }}
            />
            <p className="form-label">{isHebrew ? 'באילו ימים?' : 'Which days?'}</p>
            <ReminderDayPicker
              days={days} labels={dayLabels}
              onToggle={d => { toggleDay(d); setSaved(false) }}
              color="#7c3aed"
            />
            <button
              type="button" className="btn-primary"
              disabled={days.length === 0 || saved}
              onClick={handleSave}
              style={{ width: '100%', marginBottom: 8 }}
            >
              {saved
                ? `✅ ${isHebrew ? 'נשמר!' : 'Saved!'}`
                : isHebrew ? '💾 שמור תזכורת' : '💾 Save reminder'}
            </button>
          </>
        )}
      </div>

      {/* ── Gym reminder — only shown when the user picked gym days ─────────── */}
      {hasGymDays && (
        <div style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 14, padding: '16px 14px', marginBottom: 24,
        }}>
          <p className="form-label" style={{ marginBottom: 4, color: '#22c55e' }}>
            🏋️ {isHebrew ? 'תזכורת חדר כושר' : 'Gym reminder'}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
            {isHebrew
              ? 'תזכורת נפרדת בשעה משלה, רק לאימוני חדר הכושר.'
              : 'A separate reminder at its own time, just for gym sessions.'}
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button type="button"
              className={`option-card compact${wantGymReminder ? ' selected' : ''}`}
              style={{ flex: 1 }} onClick={() => setWantGymReminder(true)}
            >
              <span className="option-label">✅ {isHebrew ? 'כן' : 'Yes'}</span>
            </button>
            <button type="button"
              className={`option-card compact${!wantGymReminder ? ' selected' : ''}`}
              style={{ flex: 1 }} onClick={() => setWantGymReminder(false)}
            >
              <span className="option-label">🚫 {isHebrew ? 'לא' : 'No'}</span>
            </button>
          </div>

          {wantGymReminder && (
            <>
              <p className="form-label">{isHebrew ? 'שעת ההתראה לחדר כושר' : 'Gym reminder time'}</p>
              <input
                type="time" value={gymTime}
                onChange={e => { setGymTime(e.target.value); setGymSaved(false) }}
                style={{
                  borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: '#fff',
                  padding: '10px 14px', fontSize: 18, marginBottom: 18, width: 140,
                }}
              />
              <p className="form-label">{isHebrew ? 'ימי חדר כושר' : 'Gym days'}</p>
              <ReminderDayPicker
                days={gymDays} labels={dayLabels}
                onToggle={d => { toggleGymDay(d); setGymSaved(false) }}
                color="#22c55e"
              />
              <button
                type="button" className="btn-primary"
                disabled={gymDays.length === 0 || gymSaved}
                onClick={handleSaveGym}
                style={{ width: '100%', marginBottom: 8, background: '#22c55e', borderColor: '#22c55e' }}
              >
                {gymSaved
                  ? `✅ ${isHebrew ? 'נשמר!' : 'Saved!'}`
                  : isHebrew ? '💾 שמור תזכורת חדר כושר' : '💾 Save gym reminder'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="onboard-nav">
        <button className="btn-ghost" type="button" onClick={onBack}>
          {isHebrew ? 'חזרה' : 'Back'}
        </button>
        <button className="btn-primary onboard-next" type="button" onClick={() => onNext({ reminderSound: withSound })}>
          {isHebrew ? 'סיום 🎉' : 'Finish 🎉'}
        </button>
      </div>
    </div>
  )
}

const TOTAL_STEPS = 11  // step 1 = auth, steps 2-11 = profile + reminders

export default function OnboardingPage() {
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [collected, setCollected] = useState<Partial<UserProfile>>({})

  const finishOrContinue = (data: Partial<UserProfile>) => {
    const merged = { ...collected, ...data }
    setCollected(merged)

    if (step < TOTAL_STEPS) {
      setStep(current => current + 1)
      return
    }

    const workoutTime = merged.workout_time ?? merged.workoutDuration ?? 20
    completeOnboarding({
      ...merged,
      goal: merged.goal ?? merged.goals?.[0] ?? 'fitness',
      goals: merged.goals?.length ? merged.goals : ['fitness'],
      fitnessLevel: merged.fitnessLevel ?? merged.level ?? 'beginner',
      level: merged.level ?? merged.fitnessLevel ?? 'beginner',
      workout_days: merged.workout_days ?? 3,
      workout_time: getWorkoutDuration(workoutTime),
      workoutDuration: getWorkoutDuration(workoutTime),
      equipment: merged.equipment?.length ? merged.equipment : ['none'],
      nutrition: merged.nutrition ?? { eatsRegularly: true, mealsPerDay: 3 },
      health: merged.health ?? { energyLevel: 'medium', hasPainOrInjuries: false, sensitiveAreas: [], sleepHours: 7 },
      habits: merged.habits ?? { dailyActivity: 'medium', fixedWorkoutTime: false, hardestPart: 'consistency' },
      devices: merged.devices ?? { cardioLocation: false, smartScale: false, smartWatch: false },
    })
    navigate('/dashboard')
  }

  // Back: step 1 is auth — can't go back further
  const handleBack = () => setStep(current => Math.max(1, current - 1))
  const handleSkip = (data: Partial<UserProfile> = {}) => finishOrContinue(data)
  const commonProps = { data: collected, onBack: handleBack, onNext: finishOrContinue, onSkip: handleSkip, step, total: TOTAL_STEPS }

  return (
    <OnboardingQuestionnaire>
      <div className="onboard-layout">
        <div className="onboard-card">
          {step === 1 && <StepAuth onNext={finishOrContinue} step={step} total={TOTAL_STEPS} />}
          {step === 2 && <StepBasic {...commonProps} />}
          {step === 3 && <StepGoals {...commonProps} />}
          {step === 4 && <StepLevel {...commonProps} />}
          {step === 5 && <StepEquipment {...commonProps} />}
          {step === 6 && <StepTime {...commonProps} />}
          {step === 7 && <StepWeeklyPlan {...commonProps} />}
          {step === 8 && <StepNutrition {...commonProps} />}
          {step === 9 && <StepHealth {...commonProps} />}
          {step === 10 && <StepHabits {...commonProps} />}
          {step === 11 && <StepReminders {...commonProps} />}
        </div>
      </div>
    </OnboardingQuestionnaire>
  )
}
