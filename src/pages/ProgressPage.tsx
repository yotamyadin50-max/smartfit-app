import PageHeader from '../components/layout/PageHeader'
import { useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { useUser } from '../context/UserContext'
import {
  mockWorkoutHistory,
  mockAchievements,
  mockMeasurements,
  mockMonthlySummary,
  mockAIProgressInsight,
} from '../data/mockProgress'

import AnimalRankCard from '../components/AnimalRankCard'
import { getProgressData, type WorkoutProgressEntry } from '../progressStorage'

function getStartOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function getWeekBars(entries: WorkoutProgressEntry[]) {
  const weekStart = getStartOfWeek(new Date())
  const minutesByDay = Array.from({ length: 7 }, () => 0)

  entries.forEach(entry => {
    const date = new Date(entry.date)
    if (!Number.isFinite(date.getTime()) || date < weekStart) return
    minutesByDay[date.getDay()] += entry.duration
  })

  const maxMinutes = Math.max(1, ...minutesByDay)
  return minutesByDay.map(minutes => Math.max(8, Math.round((minutes / maxMinutes) * 100)))
}

function GraphPlaceholder({ heights, label }: { heights?: number[]; label: string }) {
  const barHeights = heights?.length === 7 ? heights : [60, 80, 45, 90, 70, 85, 55]

  return (
    <div className="graph-placeholder">
      <div className="graph-bars">
        {barHeights.map((height, index) => (
          <div key={`graph-bar-${index}-${height}`} className="graph-bar" style={{ height: `${height}%` }} />
        ))}
      </div>
      <p className="graph-label">{label}</p>
    </div>
  )
}

function MeasurementsSection() {
  const { t } = useI18n()
  const latest = mockMeasurements[mockMeasurements.length - 1]
  const prev = mockMeasurements[mockMeasurements.length - 2]

  if (!latest || !prev) {
    return (
      <div className="measurements-card">
        <h3 className="section-title">{t('bodyMeasurements')}</h3>
        <p className="measurement-note">{t('noMeasurements')}</p>
      </div>
    )
  }

  const weightDiff = (latest.weight - prev.weight).toFixed(1)

  return (
    <div className="measurements-card">
      <h3 className="section-title">{t('bodyMeasurements')}</h3>
      <div className="measurements-grid">
        <div className="measurement-item">
          <span className="measurement-label">Weight</span>
          <span className="measurement-value">{latest.weight} kg</span>
          <span className={`measurement-delta ${Number(weightDiff) < 0 ? 'positive' : 'negative'}`}>
            {weightDiff} kg
          </span>
        </div>
        {latest.bodyFat && (
          <div className="measurement-item">
            <span className="measurement-label">Body Fat</span>
            <span className="measurement-value">{latest.bodyFat}%</span>
          </div>
        )}
        {latest.chest && (
          <div className="measurement-item">
            <span className="measurement-label">Chest</span>
            <span className="measurement-value">{latest.chest} cm</span>
          </div>
        )}
        {latest.waist && (
          <div className="measurement-item">
            <span className="measurement-label">Waist</span>
            <span className="measurement-value">{latest.waist} cm</span>
          </div>
        )}
      </div>
      <p className="measurement-note">{t('photoProgress')}: <span className="badge-coming-soon">{t('comingSoon')}</span></p>
    </div>
  )
}

export default function ProgressPage() {
  const { t, language } = useI18n()
  const { stats } = useUser()
  const isHebrew = language === 'he'
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'achievements'>('overview')
  const [progressData] = useState(() => getProgressData())
  const progressEntries = [...progressData.workouts, ...progressData.cardio]
  const weekStart = getStartOfWeek(new Date())
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const weeklyEntries = progressEntries.filter(entry => new Date(entry.date) >= weekStart)
  const monthlyEntries = progressEntries.filter(entry => new Date(entry.date) >= monthStart)
  const totalMinutes = progressEntries.reduce((sum, entry) => sum + entry.duration, 0)
  const weekBars = getWeekBars(progressEntries)
  const progressInsight = progressEntries.length
    ? language === 'he'
      ? `השבוע נשמרו ${weeklyEntries.length} אימונים, החודש ${monthlyEntries.length}, ובסך הכל ${totalMinutes} דקות פעילות.`
      : `${weeklyEntries.length} workouts were saved this week, ${monthlyEntries.length} this month, with ${totalMinutes} total active minutes.`
    : language === 'he'
      ? 'עדיין אין מספיק נתונים שמורים. אחרי שתשלים אימון אחד, SmartFit יציג כאן סיכום התקדמות מותאם.'
      : mockAIProgressInsight
  const weeklyGraphLabel = language === 'he' ? 'אימונים לפי ימי השבוע' : 'Workouts by weekday'

  return (
    <div className="app-layout">
      <PageHeader title={t('progressTitle')} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        <AnimalRankCard
          className="animal-rank-card-progress"
          isHebrew={isHebrew}
          showCelebration
          stats={stats}
        />

        <div className="insight-card">
          <div className="insight-tag">{t('aiInsightDemo')}</div>
          <p className="insight-text">{progressInsight}</p>
        </div>

        <div className="section-tabs">
          {(['overview', 'history', 'achievements'] as const).map(section => (
            <button
              key={section}
              className={`section-tab-btn${activeSection === section ? ' active' : ''}`}
              onClick={() => setActiveSection(section)}
            >
              {t(section)}
            </button>
          ))}
        </div>

        {activeSection === 'overview' && (
          <>
            <div className="graphs-row">
              <GraphPlaceholder heights={weekBars} label={weeklyGraphLabel} />
              <GraphPlaceholder label="Weight over time" />
            </div>
            <MeasurementsSection />
            <div className="monthly-summary-card">
              <h3 className="section-title">{t('monthlySummary')} - {mockMonthlySummary.month}</h3>
              <div className="monthly-stats">
                <div className="monthly-stat"><span>{mockMonthlySummary.totalWorkouts}</span><p>{t('workouts')}</p></div>
                <div className="monthly-stat"><span>{mockMonthlySummary.totalMinutes}</span><p>{t('minutes')}</p></div>
                <div className="monthly-stat"><span>{mockMonthlySummary.totalXP}</span><p>{t('xpEarned')}</p></div>
                <div className="monthly-stat"><span>{mockMonthlySummary.weightChange} kg</span><p>{t('weightChange')}</p></div>
              </div>
              <div className="insight-card" style={{ marginTop: 12 }}>
                <div className="insight-tag">{t('monthlyInsight')}</div>
                <p className="insight-text">{mockMonthlySummary.aiInsight}</p>
              </div>
            </div>
          </>
        )}

        {activeSection === 'history' && (
          <div className="history-list">
            {progressEntries.slice(0, 10).map((history, index) => (
              <div key={`saved-history-${history.id}-${history.date}-${index}`} className="history-item">
                <div className="history-item-left">
                  <span className="history-date">{new Date(history.date).toLocaleDateString('he-IL')}</span>
                  <span className="history-name">{history.type}</span>
                  <span className="history-meta">
                    {history.duration} min{history.distanceKm ? ` - ${history.distanceKm} km` : ''}{history.feeling ? ` - ${history.feeling}` : ''}
                  </span>
                </div>
                <div className="history-item-right">
                  <span className="history-xp">{history.calories ? `${history.calories} kcal` : '+XP'}</span>
                  <span className="difficulty-badge medium">saved</span>
                </div>
              </div>
            ))}
            {mockWorkoutHistory.map((history, index) => (
              <div key={`mock-history-${history.id}-${history.date}-${index}`} className="history-item">
                <div className="history-item-left">
                  <span className="history-date">{history.date}</span>
                  <span className="history-name">{history.workoutName}</span>
                  <span className="history-meta">{history.durationMinutes} min - {history.feeling}</span>
                </div>
                <div className="history-item-right">
                  <span className="history-xp">+{history.xpEarned} XP</span>
                  <span className={`difficulty-badge ${history.difficulty}`}>{history.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'achievements' && (
          <div className="achievements-grid">
            {mockAchievements.map((achievement, index) => (
              <div key={`achievement-${achievement.id}-${index}`} className={`achievement-card${achievement.unlockedAt ? ' unlocked' : ' locked'}`}>
                <span className="achievement-emoji">{achievement.emoji}</span>
                <span className="achievement-title">{achievement.title}</span>
                <span className="achievement-desc">{achievement.description}</span>
                {achievement.unlockedAt
                  ? <span className="achievement-date">{achievement.unlockedAt}</span>
                  : <span className="achievement-locked">{t('locked')}</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
