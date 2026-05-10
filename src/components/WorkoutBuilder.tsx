import type { UserProfile } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import { generateHomeWorkout, generateGymWorkout, generateCardioWorkout } from '../localCoachEngine'

type WorkoutBuilderProps = {
  message?: string
  mode?: 'home' | 'gym' | 'cardio'
  profile?: Partial<UserProfile>
}

export default function WorkoutBuilder({ message, mode = 'home', profile }: WorkoutBuilderProps) {
  const { language } = useI18n()
  const planMessage = message ?? (language === 'he' ? 'אימון היום' : "today's workout")
  const plan = mode === 'gym'
    ? generateGymWorkout({ message: planMessage, profile }, language)
    : mode === 'cardio'
      ? generateCardioWorkout({ message: planMessage, profile }, language)
      : generateHomeWorkout({ message: planMessage, profile }, language)

  return (
    <div className="creator-result" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <pre className="meal-card-desc">{plan}</pre>
    </div>
  )
}
