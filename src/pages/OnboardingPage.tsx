import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, Goal, FitnessLevel, WorkoutType, NutritionPref } from '../context/UserContext'

interface StepProps {
  onNext: (data: object) => void
  onBack?: () => void
  step: number
  total: number
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="onboard-dots">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`onboard-dot${i < step ? ' filled' : ''}`} />
      ))}
    </div>
  )
}

function StepGoal({ onNext, step, total }: StepProps) {
  const [selected, setSelected] = useState<Goal | null>(null)
  const options: { value: Goal; label: string; emoji: string; desc: string }[] = [
    { value: 'cut', label: 'Tone Up', emoji: '✂️', desc: 'Lose fat, get lean' },
    { value: 'bulk', label: 'Build Muscle', emoji: '💪', desc: 'Gain size and strength' },
    { value: 'fitness', label: 'General Fitness', emoji: '🏃', desc: 'Get fitter overall' },
    { value: 'health', label: 'Health & Wellbeing', emoji: '❤️', desc: 'Feel better daily' },
  ]
  return (
    <div className="onboard-step">
      <ProgressDots step={step} total={total} />
      <h2 className="onboard-title">What's your main goal?</h2>
      <p className="onboard-sub">This shapes your workouts and nutrition plan</p>
      <div className="option-grid">
        {options.map(o => (
          <button
            key={o.value}
            className={`option-card${selected === o.value ? ' selected' : ''}`}
            onClick={() => setSelected(o.value)}
          >
            <span className="option-emoji">{o.emoji}</span>
            <span className="option-label">{o.label}</span>
            <span className="option-desc">{o.desc}</span>
          </button>
        ))}
      </div>
      <button className="btn-primary" disabled={!selected} onClick={() => onNext({ goal: selected })}>
        Continue
      </button>
    </div>
  )
}

function StepLevel({ onNext, onBack, step, total }: StepProps) {
  const [selected, setSelected] = useState<FitnessLevel | null>(null)
  const options: { value: FitnessLevel; label: string; emoji: string; desc: string }[] = [
    { value: 'beginner', label: 'Beginner', emoji: '🌱', desc: 'Less than 6 months training' },
    { value: 'intermediate', label: 'Intermediate', emoji: '🔥', desc: '6 months to 2 years' },
    { value: 'advanced', label: 'Advanced', emoji: '⚡', desc: 'More than 2 years' },
  ]
  return (
    <div className="onboard-step">
      <ProgressDots step={step} total={total} />
      <h2 className="onboard-title">Your fitness level?</h2>
      <p className="onboard-sub">Be honest — we'll calibrate your intensity</p>
      <div className="option-grid col-3">
        {options.map(o => (
          <button
            key={o.value}
            className={`option-card${selected === o.value ? ' selected' : ''}`}
            onClick={() => setSelected(o.value)}
          >
            <span className="option-emoji">{o.emoji}</span>
            <span className="option-label">{o.label}</span>
            <span className="option-desc">{o.desc}</span>
          </button>
        ))}
      </div>
      <div className="onboard-nav">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary onboard-next" disabled={!selected} onClick={() => onNext({ fitnessLevel: selected })}>Continue</button>
      </div>
    </div>
  )
}

function StepDuration({ onNext, onBack, step, total }: StepProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const options = [15, 30, 45, 60]
  return (
    <div className="onboard-step">
      <ProgressDots step={step} total={total} />
      <h2 className="onboard-title">Preferred workout length?</h2>
      <p className="onboard-sub">We'll fit sessions into your schedule</p>
      <div className="option-grid col-4">
        {options.map(o => (
          <button
            key={o}
            className={`option-card compact${selected === o ? ' selected' : ''}`}
            onClick={() => setSelected(o)}
          >
            <span className="option-label">{o} min</span>
          </button>
        ))}
      </div>
      <div className="onboard-nav">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary onboard-next" disabled={!selected} onClick={() => onNext({ workoutDuration: selected })}>Continue</button>
      </div>
    </div>
  )
}

function StepWorkoutType({ onNext, onBack, step, total }: StepProps) {
  const [selected, setSelected] = useState<WorkoutType | null>(null)
  const options: { value: WorkoutType; label: string; emoji: string }[] = [
    { value: 'gym', label: 'Gym', emoji: '🏋️' },
    { value: 'home', label: 'Home', emoji: '🏠' },
    { value: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  ]
  return (
    <div className="onboard-step">
      <ProgressDots step={step} total={total} />
      <h2 className="onboard-title">Where do you train?</h2>
      <p className="onboard-sub">Your environment shapes exercise selection</p>
      <div className="option-grid col-3">
        {options.map(o => (
          <button
            key={o.value}
            className={`option-card${selected === o.value ? ' selected' : ''}`}
            onClick={() => setSelected(o.value)}
          >
            <span className="option-emoji">{o.emoji}</span>
            <span className="option-label">{o.label}</span>
          </button>
        ))}
      </div>
      <div className="onboard-nav">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary onboard-next" disabled={!selected} onClick={() => onNext({ workoutType: selected })}>Continue</button>
      </div>
    </div>
  )
}

function StepNutrition({ onNext, onBack, step, total }: StepProps) {
  const [selected, setSelected] = useState<NutritionPref | null>(null)
  const options: { value: NutritionPref; label: string; emoji: string }[] = [
    { value: 'none', label: 'No restrictions', emoji: '🍽️' },
    { value: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
    { value: 'vegan', label: 'Vegan', emoji: '🌱' },
    { value: 'gluten-free', label: 'Gluten-free', emoji: '🌾' },
  ]
  return (
    <div className="onboard-step">
      <ProgressDots step={step} total={total} />
      <h2 className="onboard-title">Dietary preference?</h2>
      <p className="onboard-sub">Meals will be tailored to your needs</p>
      <div className="option-grid">
        {options.map(o => (
          <button
            key={o.value}
            className={`option-card compact${selected === o.value ? ' selected' : ''}`}
            onClick={() => setSelected(o.value)}
          >
            <span className="option-emoji">{o.emoji}</span>
            <span className="option-label">{o.label}</span>
          </button>
        ))}
      </div>
      <div className="onboard-nav">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary onboard-next" disabled={!selected} onClick={() => onNext({ nutritionPref: selected })}>Continue</button>
      </div>
    </div>
  )
}

function StepNotifications({ onNext, onBack, step, total }: StepProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [time, setTime] = useState('08:00')
  return (
    <div className="onboard-step">
      <ProgressDots step={step} total={total} />
      <h2 className="onboard-title">Daily reminder?</h2>
      <p className="onboard-sub">Stay consistent with a workout nudge</p>
      <div className="option-grid col-2">
        <button className={`option-card compact${enabled === true ? ' selected' : ''}`} onClick={() => setEnabled(true)}>
          <span className="option-emoji">🔔</span>
          <span className="option-label">Yes, remind me</span>
        </button>
        <button className={`option-card compact${enabled === false ? ' selected' : ''}`} onClick={() => setEnabled(false)}>
          <span className="option-emoji">🔕</span>
          <span className="option-label">No thanks</span>
        </button>
      </div>
      {enabled && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">Reminder time</label>
          <input
            type="time"
            className="form-input"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>
      )}
      <div className="onboard-nav">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button
          className="btn-primary onboard-next"
          disabled={enabled === null}
          onClick={() => onNext({ notificationsEnabled: enabled, reminderTime: time })}
        >
          Let's Go!
        </button>
      </div>
    </div>
  )
}

const TOTAL_STEPS = 6

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [collected, setCollected] = useState<object>({})
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()

  const handleNext = (data: object) => {
    const merged = { ...collected, ...data }
    setCollected(merged)
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
    } else {
      completeOnboarding(merged as Parameters<typeof completeOnboarding>[0])
      navigate('/dashboard')
    }
  }

  const handleBack = () => setStep(s => s - 1)

  const commonProps = { onNext: handleNext, onBack: handleBack, step, total: TOTAL_STEPS }

  return (
    <div className="onboard-layout">
      <div className="onboard-card">
        {step === 1 && <StepGoal {...commonProps} onBack={undefined} />}
        {step === 2 && <StepLevel {...commonProps} />}
        {step === 3 && <StepDuration {...commonProps} />}
        {step === 4 && <StepWorkoutType {...commonProps} />}
        {step === 5 && <StepNutrition {...commonProps} />}
        {step === 6 && <StepNotifications {...commonProps} />}
      </div>
    </div>
  )
}
