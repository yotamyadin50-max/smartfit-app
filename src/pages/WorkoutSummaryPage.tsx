import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

type Difficulty = 'easy' | 'medium' | 'hard'
type Completion = 'yes' | 'partial' | 'no'
type Feeling = 'strong' | 'normal' | 'tired'
type Pain = 'yes' | 'no'

const BASE_XP = 120
const FEEDBACK_BONUS_XP = 15

export default function WorkoutSummaryPage() {
  const { stats, addXP, incrementStreak } = useUser()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<'celebration' | 'feedback'>('celebration')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [pain, setPain] = useState<Pain | null>(null)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    addXP(BASE_XP)
    incrementStreak()
    const t = setTimeout(() => setPhase('feedback'), 2500)
    return () => clearTimeout(t)
  }, [])

  const allAnswered = difficulty && completion && feeling && pain

  const handleFinish = () => {
    if (allAnswered) addXP(FEEDBACK_BONUS_XP)
    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 1200)
  }

  if (phase === 'celebration') {
    return (
      <div className="summary-celebration">
        <div className="celebration-emoji">🎉</div>
        <h1 className="celebration-title">Workout Complete!</h1>
        <div className="celebration-badges">
          <div className="xp-badge">+{BASE_XP} XP</div>
          <div className="streak-badge">🔥 {stats.streak + 1} day streak</div>
        </div>
        <p className="celebration-sub">Keep it up — results come from consistency!</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="summary-celebration">
        <div className="celebration-emoji">⚡</div>
        <h2 className="celebration-title">+{FEEDBACK_BONUS_XP} Bonus XP!</h2>
        <p className="celebration-sub">Thanks for the feedback. See you tomorrow!</p>
      </div>
    )
  }

  return (
    <div className="summary-feedback-layout">
      <h2 className="summary-title">How was your workout?</h2>
      <p className="summary-sub">Your answers help us improve next time</p>

      <div className="feedback-section">
        <p className="feedback-q">How hard was it?</p>
        <div className="feedback-options">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(v => (
            <button key={v} className={`feedback-option-btn${difficulty === v ? ' active' : ''}`} onClick={() => setDifficulty(v)}>
              {v === 'easy' ? '😌 Easy' : v === 'medium' ? '💪 Medium' : '🔥 Hard'}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-section">
        <p className="feedback-q">Did you finish everything?</p>
        <div className="feedback-options">
          {([['yes', '✅ Yes'], ['partial', '⚡ Partially'], ['no', '❌ No']] as [Completion, string][]).map(([v, label]) => (
            <button key={v} className={`feedback-option-btn${completion === v ? ' active' : ''}`} onClick={() => setCompletion(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-section">
        <p className="feedback-q">How did you feel?</p>
        <div className="feedback-options">
          {([['strong', '💪 Strong'], ['normal', '😐 Normal'], ['tired', '😴 Tired']] as [Feeling, string][]).map(([v, label]) => (
            <button key={v} className={`feedback-option-btn${feeling === v ? ' active' : ''}`} onClick={() => setFeeling(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-section">
        <p className="feedback-q">Any pain or discomfort?</p>
        <div className="feedback-options">
          <button className={`feedback-option-btn${pain === 'yes' ? ' active' : ''}`} onClick={() => setPain('yes')}>⚠️ Yes</button>
          <button className={`feedback-option-btn${pain === 'no' ? ' active' : ''}`} onClick={() => setPain('no')}>✅ No</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Anything to add? (optional)</label>
        <textarea
          className="form-input summary-notes"
          placeholder="e.g. felt strong on squats, shoulder hurt a little…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {allAnswered && (
        <p className="bonus-xp-hint">+{FEEDBACK_BONUS_XP} bonus XP for completing the review!</p>
      )}

      <button className="btn-primary" onClick={handleFinish}>
        Finish & Save
      </button>
    </div>
  )
}
