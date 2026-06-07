import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { getExerciseAnimationMatch, type ExerciseAnimationMatch } from '../services/exerciseAnimationService'

type AnimationStatus = 'loading' | 'ready' | 'empty' | 'error'

export function ExerciseAnimation({
  compact = false,
  exerciseName,
  gifUrl,
  hideMuscles = false,
  isActive = false,
}: {
  compact?: boolean
  exerciseName: string
  /** Direct GIF URL from ExerciseDB — skips the API lookup when provided */
  gifUrl?: string
  hideMuscles?: boolean
  isActive?: boolean
}) {
  const { isHebrew } = useI18n()
  const [match, setMatch] = useState<ExerciseAnimationMatch | null>(null)
  const [status, setStatus] = useState<AnimationStatus>(() => gifUrl ? 'ready' : 'loading')
  const [imageLoaded, setImageLoaded] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    // If a direct GIF URL is provided, skip the lookup entirely
    if (gifUrl) {
      setMatch(null)
      setStatus('ready')
      setImageLoaded(false)
      return
    }

    isMountedRef.current = true
    setStatus('loading')
    setMatch(null)
    setImageLoaded(false)

    getExerciseAnimationMatch(exerciseName)
      .then(result => {
        if (!isMountedRef.current) return
        setMatch(result)
        setStatus(result ? 'ready' : 'empty')
      })
      .catch(error => {
        if (!isMountedRef.current) return
        console.log('[ExerciseDB] animation lookup failed', {
          exerciseName,
          message: error instanceof Error ? error.message : String(error),
        })
        setStatus('error')
      })

    return () => {
      isMountedRef.current = false
    }
  }, [exerciseName, gifUrl])

  const activeSrc = gifUrl ?? match?.exercise.gifUrl
  const showSkeleton = status === 'loading' || (status === 'ready' && !imageLoaded)
  const placeholderText = isHebrew ? 'אנימציה לא זמינה' : 'Animation unavailable'
  const loadingText = isHebrew ? 'טוען אנימציה' : 'Loading animation'

  return (
    <div
      className={[
        'exercise-animation-card',
        compact ? 'compact' : '',
        isActive ? 'active' : '',
      ].filter(Boolean).join(' ')}
      aria-label={activeSrc ? `${exerciseName} animation` : placeholderText}
      title={activeSrc ? exerciseName : placeholderText}
    >
      {showSkeleton && (
        <div className="exercise-animation-skeleton" aria-hidden="true">
          <span>{compact ? '' : loadingText}</span>
        </div>
      )}

      {activeSrc ? (
        <img
          alt={exerciseName}
          className="exercise-animation-gif"
          loading="lazy"
          onError={() => {
            setStatus('error')
          }}
          onLoad={() => setImageLoaded(true)}
          src={activeSrc}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      ) : status !== 'loading' ? (
        <div className="exercise-animation-placeholder">
          <span className="exercise-animation-placeholder-icon">↗</span>
          {!compact && <span>{placeholderText}</span>}
        </div>
      ) : null}

      {!compact && !hideMuscles && match?.exercise.targetMuscles?.length ? (
        <div className="exercise-animation-tags" aria-hidden="true">
          {match.exercise.targetMuscles.slice(0, 3).map(muscle => (
            <span key={`${match.exercise.exerciseId}-${muscle}`}>{muscle}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
