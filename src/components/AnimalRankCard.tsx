import { useEffect, useState } from 'react'
import {
  getAnimalName,
  getAnimalProgress,
  type AnimalRankProgress,
} from '../lib/animalRanks'

const LAST_SEEN_ANIMAL_RANK_KEY = 'smartfit_last_animal_rank'

type AnimalRankCardProps = {
  className?: string
  isHebrew: boolean
  showCelebration?: boolean
  stats: {
    level: number
    streak: number
    xp: number
  }
  userName?: string
}

function getCopy(isHebrew: boolean, progress: AnimalRankProgress) {
  const currentName = getAnimalName(progress.current, isHebrew)
  const nextName = progress.next ? getAnimalName(progress.next, isHebrew) : null

  return {
    currentName,
    label: isHebrew ? 'דרגת חיה' : 'Animal rank',
    level: isHebrew ? `רמה ${progress.level}` : `Level ${progress.level}`,
    next: nextName
      ? isHebrew
        ? `עוד ${progress.levelsUntilNextAnimal} רמות ל${nextName}`
        : `${progress.levelsUntilNextAnimal} levels to ${nextName}`
      : isHebrew
        ? 'הגעת לנמר - הדרגה הגבוהה ביותר'
        : 'Tiger reached - highest rank',
    celebration: isHebrew
      ? `התפתחת ל${currentName}!`
      : `You evolved into ${currentName}!`,
    xp: isHebrew
      ? `עוד ${progress.xpToNextLevel} XP לרמה הבאה`
      : `${progress.xpToNextLevel} XP to next level`,
  }
}

export default function AnimalRankCard({
  className = '',
  isHebrew,
  showCelebration = false,
  stats,
  userName,
}: AnimalRankCardProps) {
  const progress = getAnimalProgress(stats)
  const copy = getCopy(isHebrew, progress)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    if (!showCelebration) return

    let previousRank = NaN
    try {
      previousRank = Number(window.localStorage.getItem(LAST_SEEN_ANIMAL_RANK_KEY))
      window.localStorage.setItem(LAST_SEEN_ANIMAL_RANK_KEY, String(progress.rankIndex))
    } catch { /* storage blocked */ }

    if (Number.isFinite(previousRank) && progress.rankIndex > previousRank) {
      setCelebrating(true)
      const timer = window.setTimeout(() => setCelebrating(false), 4500)
      return () => window.clearTimeout(timer)
    }
  }, [progress.rankIndex, showCelebration])

  return (
    <section className={`animal-rank-card ${className}`.trim()}>
      {celebrating && (
        <div className="animal-rank-celebration" role="status">
          <span>{progress.current.emoji}</span>
          <strong>{copy.celebration}</strong>
        </div>
      )}

      <div className="animal-rank-main">
        <div className="animal-rank-avatar" aria-label={copy.currentName}>
          {progress.current.imageUrl
            ? <img src={progress.current.imageUrl} alt={copy.currentName} />
            : <span>{progress.current.emoji}</span>}
        </div>

        <div className="animal-rank-copy">
          <span className="animal-rank-label">{copy.label}</span>
          <h3>{copy.currentName}</h3>
          <p>
            {userName ? `${userName} · ` : ''}{copy.level}
          </p>
        </div>
      </div>

      <div className="animal-rank-progress">
        <div className="animal-rank-progress-top">
          <span>{copy.xp}</span>
          <span>{progress.currentLevelXp} / {progress.totalXpForNextLevel} XP</span>
        </div>
        <div className="animal-rank-track">
          <div className="animal-rank-fill" style={{ width: `${progress.levelProgressPct * 100}%` }} />
        </div>
        <p className="animal-rank-next">{copy.next}</p>
      </div>
    </section>
  )
}
