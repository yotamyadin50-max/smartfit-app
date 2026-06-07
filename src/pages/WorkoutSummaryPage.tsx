import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useUser } from '../context/UserContext'
import { updateWorkoutEntry } from '../progressStorage'

type Difficulty = 'easy' | 'medium' | 'hard'
type Completion = 'yes' | 'partial' | 'no'
type Feeling = 'strong' | 'normal' | 'tired'
type Pain = 'yes' | 'no'

const BASE_XP = 120
const FEEDBACK_BONUS_XP = 15

export default function WorkoutSummaryPage() {
  const { user } = useAuth()
  const { stats, addXP, incrementStreak } = useUser()
  const { isHebrew, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { completionId?: string } | null

  const [phase, setPhase] = useState<'celebration' | 'feedback'>('celebration')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [pain, setPain] = useState<Pain | null>(null)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [bonusAwarded, setBonusAwarded] = useState(false)

  useEffect(() => {
    const completionId = routeState?.completionId ?? 'direct-summary'
    const rewardKey = `smartfit_rewarded_${completionId}`

    if (!window.sessionStorage.getItem(rewardKey)) {
      window.sessionStorage.setItem(rewardKey, 'true')
      addXP(BASE_XP)
      incrementStreak()
    }

    const timer = window.setTimeout(() => setPhase('feedback'), 2500)
    return () => window.clearTimeout(timer)
  }, [addXP, incrementStreak, routeState?.completionId])

  const allAnswered = Boolean(difficulty && completion && feeling && pain)

  const handleFinish = () => {
    if (allAnswered && !bonusAwarded) {
      addXP(FEEDBACK_BONUS_XP)
      setBonusAwarded(true)
    }
    const completionId = routeState?.completionId
    if (completionId) {
      updateWorkoutEntry(completionId, {
        completion: completion ?? undefined,
        difficulty: difficulty ?? undefined,
        feeling: feeling ?? undefined,
        notes: notes.trim() || undefined,
        pain: pain ?? undefined,
      })
    }
    setSubmitted(true)
    window.setTimeout(() => navigate('/dashboard'), 1200)
  }

  const handleShareWorkout = () => {
    if (!user) return
    navigate('/social?tab=feed&share=1')
  }

  if (phase === 'celebration') {
    return (
      <div className="summary-celebration">
        <div className="celebration-emoji">✓</div>
        <h1 className="celebration-title">{t('workoutComplete')}</h1>
        <div className="celebration-badges">
          <div className="xp-badge">+{BASE_XP} XP</div>
          <div className="streak-badge">{stats.streak + 1} {t('dayStreak')}</div>
        </div>
        <p className="celebration-sub">{t('consistency')}</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="summary-celebration">
        <div className="celebration-emoji">XP</div>
        <h2 className="celebration-title">+{allAnswered ? FEEDBACK_BONUS_XP : 0} XP</h2>
        <p className="celebration-sub">{t('feedbackThanks')}</p>
      </div>
    )
  }

  return (
    <div className="summary-feedback-layout">
      <h2 className="summary-title">{t('workoutFeedbackTitle')}</h2>
      <p className="summary-sub">{t('workoutFeedbackSub')}</p>

      <div className="feedback-section">
        <p className="feedback-q">{t('difficultyQuestion')}</p>
        <div className="feedback-options">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(value => (
            <button key={value} className={`feedback-option-btn${difficulty === value ? ' active' : ''}`} onClick={() => setDifficulty(value)}>
              {value === 'easy' ? t('easy') : value === 'medium' ? t('good') : t('hard')}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-section">
        <p className="feedback-q">{t('completionQuestion')}</p>
        <div className="feedback-options">
          {([['yes', t('yes')], ['partial', t('partially')], ['no', t('no')]] as [Completion, string][]).map(([value, label]) => (
            <button key={value} className={`feedback-option-btn${completion === value ? ' active' : ''}`} onClick={() => setCompletion(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-section">
        <p className="feedback-q">{t('feelingQuestion')}</p>
        <div className="feedback-options">
          {([['strong', t('strong')], ['normal', t('normal')], ['tired', t('tired')]] as [Feeling, string][]).map(([value, label]) => (
            <button key={value} className={`feedback-option-btn${feeling === value ? ' active' : ''}`} onClick={() => setFeeling(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-section">
        <p className="feedback-q">{t('painQuestion')}</p>
        <div className="feedback-options">
          <button className={`feedback-option-btn${pain === 'yes' ? ' active' : ''}`} onClick={() => setPain('yes')}>{t('yes')}</button>
          <button className={`feedback-option-btn${pain === 'no' ? ' active' : ''}`} onClick={() => setPain('no')}>{t('no')}</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t('notesQuestion')}</label>
        <textarea
          className="form-input summary-notes"
          value={notes}
          onChange={event => setNotes(event.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      {allAnswered && (
        <p className="bonus-xp-hint">+{FEEDBACK_BONUS_XP} XP</p>
      )}

      <button className="btn-secondary" onClick={handleShareWorkout} disabled={!user}>
        {isHebrew ? 'בחר חברים לשיתוף האימון' : 'Choose friends to share this workout'}
      </button>

      <button className="btn-primary" onClick={handleFinish}>
        {t('finishSave')}
      </button>
    </div>
  )
}
