import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { todayWorkout, Exercise } from '../data/mockWorkouts'

type Phase = 'preview' | 'countdown' | 'active' | 'rest' | 'done'

function ExercisePreview({ exercises, onStart }: { exercises: Exercise[]; onStart: () => void }) {
  return (
    <div className="workout-preview">
      <div className="workout-preview-header">
        <h1 className="workout-title">{todayWorkout.name}</h1>
        <div className="workout-meta-row">
          <span>⏱ {todayWorkout.durationMinutes} min</span>
          <span>📋 {exercises.length} exercises</span>
          <span className={`difficulty-badge ${todayWorkout.difficulty}`}>{todayWorkout.difficulty}</span>
        </div>
      </div>
      <ul className="exercise-list">
        {exercises.map((ex, i) => (
          <li key={ex.id} className="exercise-list-item">
            <span className="exercise-num">{i + 1}</span>
            <div className="exercise-list-info">
              <span className="exercise-list-name">{ex.name}</span>
              <span className="exercise-list-detail">{ex.sets} sets × {ex.reps} reps · {ex.restSeconds}s rest</span>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn-primary btn-start" onClick={onStart}>Start Workout</button>
    </div>
  )
}

function CountdownOverlay({ value }: { value: number }) {
  return (
    <div className="countdown-overlay">
      <div className="countdown-circle">{value === 0 ? 'GO!' : value}</div>
      <p className="countdown-label">Get ready…</p>
    </div>
  )
}

function RestTimer({ seconds, onDone, onSkip }: { seconds: number; onDone: () => void; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onDone])

  return (
    <div className="rest-timer-overlay">
      <p className="rest-label">Rest Time</p>
      <div className="rest-countdown">{remaining}s</div>
      <button className="btn-ghost" onClick={onSkip}>Skip Rest</button>
    </div>
  )
}

function SkipConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="skip-confirm-overlay">
      <div className="skip-confirm-card">
        <p>Skip this exercise?</p>
        <div className="skip-confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>Skip</button>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutPage() {
  const navigate = useNavigate()
  const exercises = todayWorkout.exercises
  const total = exercises.length

  const [phase, setPhase] = useState<Phase>('preview')
  const [countdown, setCountdown] = useState(3)
  const [exIndex, setExIndex] = useState(0)
  const [setIndex, setSetIndex] = useState(0)
  const [showSkip, setShowSkip] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)

  const currentEx = exercises[exIndex]

  const goToNext = useCallback(() => {
    const nextSet = setIndex + 1
    if (nextSet < currentEx.sets) {
      setSetIndex(nextSet)
      setPhase('rest')
    } else if (exIndex + 1 < total) {
      setExIndex(i => i + 1)
      setSetIndex(0)
      setPhase('rest')
    } else {
      setPhase('done')
    }
    setLastFeedback(null)
  }, [setIndex, currentEx, exIndex, total])

  // Countdown tick
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) {
      const t = setTimeout(() => setPhase('active'), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => navigate('/workout/summary'), 300)
      return () => clearTimeout(t)
    }
  }, [phase, navigate])

  const handleStart = () => {
    setCountdown(3)
    setPhase('countdown')
  }

  const handleSetDone = (feedback: string) => {
    setLastFeedback(feedback)
    setTimeout(() => goToNext(), 800)
  }

  const handleSkipConfirm = () => {
    setShowSkip(false)
    if (exIndex + 1 < total) {
      setExIndex(i => i + 1)
      setSetIndex(0)
      setPhase('active')
    } else {
      setPhase('done')
    }
  }

  if (phase === 'preview') return <ExercisePreview exercises={exercises} onStart={handleStart} />
  if (phase === 'countdown') return <CountdownOverlay value={countdown} />
  if (phase === 'rest') return (
    <RestTimer
      seconds={currentEx.restSeconds}
      onDone={() => setPhase('active')}
      onSkip={() => setPhase('active')}
    />
  )

  return (
    <div className="workout-active-layout">
      {showSkip && (
        <SkipConfirm onConfirm={handleSkipConfirm} onCancel={() => setShowSkip(false)} />
      )}

      <div className="workout-progress-bar-wrap">
        <div
          className="workout-progress-bar-fill"
          style={{ width: `${((exIndex) / total) * 100}%` }}
        />
      </div>

      <p className="exercise-counter">Exercise {exIndex + 1} of {total}</p>

      <div className="exercise-focus-card">
        <div className="exercise-image-placeholder">🏋️</div>
        <h2 className="exercise-focus-name">{currentEx.name}</h2>
        <p className="exercise-focus-sets">
          Set {setIndex + 1} of {currentEx.sets} · {currentEx.reps} reps
        </p>
        <p className="exercise-focus-instruction">{currentEx.instruction}</p>
      </div>

      {lastFeedback ? (
        <div className="set-feedback-msg">✅ {lastFeedback}</div>
      ) : (
        <div className="set-feedback-buttons">
          <p className="set-feedback-label">How did that feel?</p>
          <div className="set-feedback-row">
            {['Easy 😌', 'Good 💪', 'Hard 🔥'].map(f => (
              <button key={f} className="feedback-btn" onClick={() => handleSetDone(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn-skip" onClick={() => setShowSkip(true)}>Skip exercise</button>
    </div>
  )
}
