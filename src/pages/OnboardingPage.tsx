import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { useAuth } from '../context/AuthContext'
import OnboardingQuestionnaire from '../components/OnboardingQuestionnaire'
import {
  DEFAULT_PROFILE_AGE,
  MAX_PROFILE_AGE,
  MIN_PROFILE_AGE,
  sanitizeProfileAge,
  useUser,
  type DailyActivityLevel,
  type EnergyLevel,
  type EquipmentOption,
  type FitnessLevel,
  type Gender,
  type Goal,
  type HabitChallenge,
  type SensitiveArea,
  type UserProfile,
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
    basicSub: 'This helps SmartFit tune workouts, meals, and AI answers.',
    basicTitle: 'Basic details',
    beginnerDesc: 'No consistent training experience',
    consistency: 'Staying consistent',
    energyHigh: 'High',
    energyLow: 'Low',
    energyMedium: 'Medium',
    equipmentBands: 'Resistance bands',
    equipmentDumbbells: 'Dumbbells',
    equipmentGym: 'Gym',
    equipmentNone: 'No equipment',
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
    basicSub: 'זה עוזר ל-SmartFit להתאים אימונים, תזונה ותשובות AI.',
    basicTitle: 'פרטים בסיסיים',
    beginnerDesc: 'אין ניסיון קבוע באימונים',
    consistency: 'התמדה באימונים',
    energyHigh: 'גבוהה',
    energyLow: 'נמוכה',
    energyMedium: 'בינונית',
    equipmentBands: 'גומיות',
    equipmentDumbbells: 'משקולות',
    equipmentGym: 'חדר כושר',
    equipmentNone: 'בלי ציוד',
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
  const { signUp } = useAuth()
  const { isHebrew } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordStrength = (() => {
    if (password.length === 0) return 0
    let score = 0
    if (password.length >= 8)  score++
    if (password.length >= 12) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    return Math.min(score, 4)
  })()
  const strengthLabelHe = ['', 'חלשה', 'בינונית', 'טובה', 'חזקה']
  const strengthLabelEn = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor   = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(isHebrew ? 'הסיסמה חייבת להכיל לפחות 8 תווים' : 'Password must be at least 8 characters')
      return
    }
    if (!/[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) {
      setError(isHebrew ? 'הסיסמה חייבת להכיל לפחות ספרה אחת או תו מיוחד' : 'Password must contain at least one number or special character')
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

  return (
    <form className="onboard-step" onSubmit={handleSubmit} noValidate>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{isHebrew ? 'יצירת חשבון' : 'Create your account'}</h2>
      <p className="onboard-sub">{isHebrew ? 'הנתונים שלך שמורים ומאובטחים.' : 'Your data is saved and secure.'}</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label className="form-label">{isHebrew ? 'אימייל' : 'Email'}</label>
        <input id="ob-email" type="email" className="form-input" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
      </div>

      <div className="form-group">
        <label className="form-label">{isHebrew ? 'סיסמה' : 'Password'}</label>
        <input id="ob-password" type="password" className="form-input"
          placeholder={isHebrew ? 'לפחות 8 תווים' : 'At least 8 characters'}
          value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="new-password" minLength={8} required />
        {password.length > 0 && (
          <div className="password-strength-wrap">
            <div className="password-strength-bar">
              {[1,2,3,4].map(n => (
                <div key={n} className="password-strength-seg"
                  style={{ background: n <= passwordStrength ? strengthColor[passwordStrength] : 'var(--border)' }} />
              ))}
            </div>
            <span className="password-strength-label" style={{ color: strengthColor[passwordStrength] }}>
              {isHebrew ? strengthLabelHe[passwordStrength] : strengthLabelEn[passwordStrength]}
            </span>
          </div>
        )}
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
  const { language, t } = useI18n()
  const text = copy[language]
  const [name, setName] = useState('')
  const [age, setAge] = useState(DEFAULT_PROFILE_AGE)
  const [gender, setGender] = useState<Gender>('prefer_not')
  const [height, setHeight] = useState(170)
  const [weight, setWeight] = useState('')

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({
        age: sanitizeProfileAge(age),
        gender,
        heightCm: sanitizeNumber(String(height), 170, 90, 230),
        name: name.trim(),
        weightKg: weight ? sanitizeNumber(weight, 70, 25, 250) : undefined,
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.basicTitle}</h2>
      <p className="onboard-sub">{text.basicSub}</p>
      <div className="form-group">
        <label className="form-label">{text.name} ({text.optional})</label>
        <input className="form-input" value={name} onChange={event => setName(event.target.value)} maxLength={40} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('age')}</label>
        <input className="form-input" type="number" min={MIN_PROFILE_AGE} max={MAX_PROFILE_AGE} value={age} onChange={event => setAge(sanitizeNumber(event.target.value, DEFAULT_PROFILE_AGE, MIN_PROFILE_AGE, MAX_PROFILE_AGE))} />
      </div>
      <div className="form-group">
        <label className="form-label">{text.gender} ({text.optional})</label>
        <select className="form-input" value={gender} onChange={event => setGender(event.target.value as Gender)}>
          <option value="prefer_not">{text.preferNot}</option>
          <option value="male">{text.male}</option>
          <option value="female">{text.female}</option>
          <option value="other">{text.other}</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">{text.height}</label>
        <input className="form-input" type="number" min={90} max={230} value={height} onChange={event => setHeight(sanitizeNumber(event.target.value, 170, 90, 230))} />
      </div>
      <div className="form-group">
        <label className="form-label">{text.weight} ({text.optional})</label>
        <input className="form-input" type="number" min={25} max={250} value={weight} onChange={event => setWeight(event.target.value)} />
      </div>
      <NavButtons isFirst onBack={() => undefined} onSkip={() => onSkip({ age: DEFAULT_PROFILE_AGE, heightCm: 170 })} />
    </form>
  )
}

function StepGoals({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const text = copy[language]
  const [selected, setSelected] = useState<Goal[]>(['fitness'])
  const options: Array<{ label: string; value: Goal }> = [
    { value: 'fitness', label: text.generalFitness },
    { value: 'bulk', label: text.muscle },
    { value: 'endurance', label: text.stamina },
    { value: 'flexibility', label: text.flexibility },
    { value: 'health', label: text.lifestyle },
    { value: 'consistency', label: text.consistency },
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
  const { language, t } = useI18n()
  const [level, setLevel] = useState<FitnessLevel>('beginner')
  const options: Array<{ desc: string; label: string; value: FitnessLevel }> = [
    { value: 'beginner', label: t('beginner'), desc: copy[language].beginnerDesc },
    { value: 'intermediate', label: t('intermediate'), desc: '' },
    { value: 'advanced', label: t('advanced'), desc: '' },
  ]

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ fitnessLevel: level, level })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{t('onboardLevelTitle')}</h2>
      <p className="onboard-sub">{t('onboardLevelSub')}</p>
      <div className="option-grid col-3">
        {options.map(option => (
          <button type="button" key={option.value} className={`option-card${level === option.value ? ' selected' : ''}`} onClick={() => setLevel(option.value)}>
            <span className="option-label">{option.label}</span>
            {option.desc && <span className="option-desc">{option.desc}</span>}
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

  const [days, setDays] = useState(3)
  const [duration, setDuration] = useState<UserProfile['workoutDuration']>(30)
  const [homeDuration, setHomeDuration] = useState<ExtendedDuration>(30)
  const [gymDuration, setGymDuration] = useState<ExtendedDuration>(45)

  const durations: UserProfile['workoutDuration'][] = [10, 20, 30, 45]
  const extendedDurations: ExtendedDuration[] = [20, 30, 45, 60, 75, 90]

  const durationLabel = (n: number) => `${n} ${isHebrew ? 'דק׳' : 'min'}`

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      if (isMultiLocation) {
        onNext({
          workout_days: days,
          workout_time: 30,
          workoutDuration: 30,
          homeWorkoutDuration: homeDuration,
          gymWorkoutDuration: gymDuration,
        })
      } else {
        onNext({ workout_days: days, workout_time: duration, workoutDuration: duration })
      }
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.timeTitle}</h2>
      <p className="onboard-sub">{text.timeSub}</p>

      <div className="form-group">
        <label className="form-label">{text.trainingDays}</label>
        <input className="form-input" type="number" min={1} max={7} value={days}
          onChange={event => setDays(sanitizeNumber(event.target.value, 3, 1, 7))} />
      </div>

      {isMultiLocation ? (
        <>
          <p className="form-label" style={{ marginTop: 18 }}>
            🏠 {isHebrew ? 'זמן אימון בבית' : 'Home workout duration'}
          </p>
          <div className="option-grid col-3">
            {extendedDurations.map(n => (
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
            {extendedDurations.map(n => (
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
  const text = copy[language]
  const [selected, setSelected] = useState<EquipmentOption[]>(['none'])
  const [smartWatch, setSmartWatch] = useState(false)
  const [smartScale, setSmartScale] = useState(false)
  const [cardioLocation, setCardioLocation] = useState(false)
  const options: Array<{ label: string; value: EquipmentOption }> = [
    { value: 'none', label: text.equipmentNone },
    { value: 'dumbbells', label: text.equipmentDumbbells },
    { value: 'bands', label: text.equipmentBands },
    { value: 'gym', label: text.equipmentGym },
  ]

  const toggle = (value: EquipmentOption) => setSelected(current => {
    if (value === 'none') return ['none']
    const withoutNone = current.filter(item => item !== 'none')
    return withoutNone.includes(value) ? withoutNone.filter(item => item !== value) : [...withoutNone, value]
  })

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      const equipment: EquipmentOption[] = selected.length ? selected : ['none']
      const hasGym = equipment.includes('gym')
      const hasHomeEquip = equipment.some(e => e === 'none' || e === 'dumbbells' || e === 'bands')
      const workoutTypes: UserProfile['workoutTypes'] = hasGym && hasHomeEquip
        ? ['gym', 'home']
        : hasGym
        ? ['gym']
        : ['home']
      onNext({
        devices: { cardioLocation, smartScale, smartWatch },
        equipment,
        workoutType: workoutTypes[0],
        workoutTypes,
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.equipmentTitle}</h2>
      <p className="onboard-sub">{text.equipmentSub}</p>
      <div className="option-grid col-2">
        {options.map(option => (
          <button type="button" key={option.value} className={`option-card compact${selected.includes(option.value) ? ' selected' : ''}`} onClick={() => toggle(option.value)}>
            <span className="option-label">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="form-label">{language === 'he' ? 'חיבורים חכמים' : 'Smart connections'}</p>
      <p className="option-hint">
        {language === 'he' ? 'לא מחובר — ניתן להזין נתונים ידנית.' : 'Not connected — you can enter data manually.'}
      </p>
      <div className="option-grid col-3">
        <button type="button" className={`option-card compact${smartWatch ? ' selected' : ''}`} onClick={() => setSmartWatch(value => !value)}>
          <span className="option-label">{language === 'he' ? 'שעון חכם' : 'Smart watch'}</span>
        </button>
        <button type="button" className={`option-card compact${smartScale ? ' selected' : ''}`} onClick={() => setSmartScale(value => !value)}>
          <span className="option-label">{language === 'he' ? 'משקל חכם' : 'Smart scale'}</span>
        </button>
        <button type="button" className={`option-card compact${cardioLocation ? ' selected' : ''}`} onClick={() => setCardioLocation(value => !value)}>
          <span className="option-label">{language === 'he' ? 'מיקום לאירובי' : 'Cardio location'}</span>
        </button>
      </div>
      <NavButtons onBack={onBack} onSkip={() => onSkip({
        devices: { cardioLocation: false, smartScale: false, smartWatch: false },
        equipment: ['none'],
        workoutType: 'home',
        workoutTypes: ['home'],
      })} />
    </form>
  )
}

function StepNutrition({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const text = copy[language]
  const [eatsRegularly, setEatsRegularly] = useState(true)
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [likedFoods, setLikedFoods] = useState('')
  const [avoidedFoods, setAvoidedFoods] = useState('')
  const [sensitivities, setSensitivities] = useState('')

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({
        nutrition: {
          avoidedFoods: avoidedFoods.trim(),
          eatsRegularly,
          likedFoods: likedFoods.trim(),
          mealsPerDay,
          sensitivities: sensitivities.trim(),
        },
      })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.nutritionTitle}</h2>
      <p className="onboard-sub">{text.nutritionSub}</p>
      <div className="option-grid col-2">
        <button type="button" className={`option-card compact${eatsRegularly ? ' selected' : ''}`} onClick={() => setEatsRegularly(true)}><span className="option-label">{text.nutritionYes}</span></button>
        <button type="button" className={`option-card compact${!eatsRegularly ? ' selected' : ''}`} onClick={() => setEatsRegularly(false)}><span className="option-label">{text.nutritionNo}</span></button>
      </div>
      <div className="form-group">
        <label className="form-label">{text.mealsPerDay}</label>
        <input className="form-input" type="number" min={1} max={8} value={mealsPerDay} onChange={event => setMealsPerDay(sanitizeNumber(event.target.value, 3, 1, 8))} />
      </div>
      <div className="form-group">
        <label className="form-label">{language === 'he' ? 'מזונות אהובים' : 'Liked foods'}</label>
        <input className="form-input" value={likedFoods} onChange={event => setLikedFoods(event.target.value)} maxLength={180} />
      </div>
      <div className="form-group">
        <label className="form-label">{language === 'he' ? 'מזונות שאתה לא אוכל' : 'Foods to avoid'}</label>
        <input className="form-input" value={avoidedFoods} onChange={event => setAvoidedFoods(event.target.value)} maxLength={180} />
      </div>
      <div className="form-group">
        <label className="form-label">{language === 'he' ? 'רגישויות' : 'Sensitivities'}</label>
        <input className="form-input" value={sensitivities} onChange={event => setSensitivities(event.target.value)} maxLength={180} />
      </div>
      <NavButtons onBack={onBack} onSkip={() => onSkip({ nutrition: { eatsRegularly: true, mealsPerDay: 3 } })} />
    </form>
  )
}

function StepHealth({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const text = copy[language]
  const [hasPainOrInjuries, setHasPainOrInjuries] = useState(false)
  const [sensitiveAreas, setSensitiveAreas] = useState<SensitiveArea[]>([])
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium')
  const [sleepHours, setSleepHours] = useState(7)
  const areaOptions: Array<{ label: string; value: SensitiveArea }> = [
    { value: 'back', label: text.back },
    { value: 'knees', label: text.knees },
    { value: 'shoulders', label: text.shoulders },
  ]

  const toggleArea = (value: SensitiveArea) => setSensitiveAreas(current =>
    current.includes(value) ? current.filter(item => item !== value) : [...current, value],
  )

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ health: { energyLevel, hasPainOrInjuries, sensitiveAreas, sleepHours } })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.healthTitle}</h2>
      <p className="onboard-sub">{text.healthSub}</p>
      <div className="option-grid col-2">
        <button type="button" className={`option-card compact${!hasPainOrInjuries ? ' selected' : ''}`} onClick={() => setHasPainOrInjuries(false)}><span className="option-label">{text.injuriesNo}</span></button>
        <button type="button" className={`option-card compact${hasPainOrInjuries ? ' selected' : ''}`} onClick={() => setHasPainOrInjuries(true)}><span className="option-label">{text.injuriesYes}</span></button>
      </div>
      {hasPainOrInjuries && <p className="option-hint warning-text">{text.painWarning}</p>}
      <div className="option-grid col-3">
        {areaOptions.map(option => (
          <button type="button" key={option.value} className={`option-card compact${sensitiveAreas.includes(option.value) ? ' selected' : ''}`} onClick={() => toggleArea(option.value)}>
            <span className="option-label">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="form-label">{language === 'he' ? 'רמת אנרגיה' : 'Energy level'}</p>
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
        <input className="form-input" type="number" min={0} max={14} value={sleepHours} onChange={event => setSleepHours(sanitizeNumber(event.target.value, 7, 0, 14))} />
      </div>
      <NavButtons onBack={onBack} onSkip={() => onSkip({ health: { energyLevel: 'medium', hasPainOrInjuries: false, sensitiveAreas: [], sleepHours: 7 } })} />
    </form>
  )
}

function StepHabits({ onBack, onNext, onSkip, step, total }: StepProps) {
  const { language } = useI18n()
  const text = copy[language]
  const [dailyActivity, setDailyActivity] = useState<DailyActivityLevel>('medium')
  const [fixedWorkoutTime, setFixedWorkoutTime] = useState(false)
  const [hardestPart, setHardestPart] = useState<HabitChallenge>('consistency')

  return (
    <form className="onboard-step" onSubmit={event => {
      event.preventDefault()
      onNext({ habits: { dailyActivity, fixedWorkoutTime, hardestPart } })
    }}>
      <ProgressHeader step={step} total={total} />
      <h2 className="onboard-title">{text.habitsTitle}</h2>
      <p className="onboard-sub">{text.habitsSub}</p>
      <p className="form-label">{language === 'he' ? 'כמה אתה פעיל ביום רגיל?' : 'Daily activity'}</p>
      <div className="option-grid col-3">
        {([
          ['low', text.activityLow],
          ['medium', text.activityMedium],
          ['high', text.activityHigh],
        ] as Array<[DailyActivityLevel, string]>).map(([value, label]) => (
          <button type="button" key={value} className={`option-card compact${dailyActivity === value ? ' selected' : ''}`} onClick={() => setDailyActivity(value)}><span className="option-label">{label}</span></button>
        ))}
      </div>
      <p className="form-label">{language === 'he' ? 'יש זמן קבוע לאימון?' : 'Fixed workout time?'}</p>
      <div className="option-grid col-2">
        <button type="button" className={`option-card compact${fixedWorkoutTime ? ' selected' : ''}`} onClick={() => setFixedWorkoutTime(true)}><span className="option-label">{text.fixedYes}</span></button>
        <button type="button" className={`option-card compact${!fixedWorkoutTime ? ' selected' : ''}`} onClick={() => setFixedWorkoutTime(false)}><span className="option-label">{text.fixedNo}</span></button>
      </div>
      <p className="form-label">{language === 'he' ? 'מה הכי קשה לך?' : 'Hardest part'}</p>
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
      <NavButtons finish onBack={onBack} onSkip={() => onSkip({ habits: { dailyActivity: 'medium', fixedWorkoutTime: false, hardestPart: 'consistency' } })} />
    </form>
  )
}

const TOTAL_STEPS = 9  // step 1 = auth, steps 2-9 = profile questions

export default function OnboardingPage() {
  const { user } = useAuth()
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()
  // If already logged in, skip the auth step
  const [step, setStep] = useState(() => user ? 2 : 1)
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

  // Back: step 1 is auth — can't go back further; skip step 1 if already logged in
  const handleBack = () => setStep(current => Math.max(user ? 2 : 1, current - 1))
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
          {step === 7 && <StepNutrition {...commonProps} />}
          {step === 8 && <StepHealth {...commonProps} />}
          {step === 9 && <StepHabits {...commonProps} />}
        </div>
      </div>
    </OnboardingQuestionnaire>
  )
}
