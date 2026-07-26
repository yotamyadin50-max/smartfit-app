import PageHeader from '../components/layout/PageHeader'
import { useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { useUser } from '../context/UserContext'
import AnimalRankCard from '../components/AnimalRankCard'
import { ALL_BADGES } from '../data/badges'
import { getProgressData, type WorkoutProgressEntry } from '../progressStorage'
import { getWeightLog } from '../lib/shredStorage'
import { getCheckinHistory } from '../lib/dailyCheckin'

function getStartOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function getStartOfLastWeek(date: Date) {
  const thisWeek = getStartOfWeek(date)
  const prev = new Date(thisWeek)
  prev.setDate(prev.getDate() - 7)
  return prev
}

type GraphRange = 'week' | 'month' | '3months'

function getRangeBars(entries: WorkoutProgressEntry[], range: GraphRange): { heights: number[]; labels: string[] } {
  const now = new Date()
  if (range === 'week') {
    const weekStart = getStartOfWeek(now)
    const minutesByDay = Array.from({ length: 7 }, () => 0)
    entries.forEach(entry => {
      const date = new Date(entry.date)
      if (!Number.isFinite(date.getTime()) || date < weekStart) return
      minutesByDay[date.getDay()] += entry.duration
    })
    const maxM = Math.max(1, ...minutesByDay)
    return {
      heights: minutesByDay.map(m => Math.max(8, Math.round((m / maxM) * 100))),
      labels: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    }
  }

  const days = range === 'month' ? 30 : 90
  const buckets = range === 'month' ? 10 : 12  // ~3 days/bucket for month; ~1 week/bucket for 3mo
  const bucketDays = Math.ceil(days / buckets)
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  const minutesByBucket = Array.from({ length: buckets }, () => 0)
  entries.forEach(entry => {
    const date = new Date(entry.date)
    if (!Number.isFinite(date.getTime()) || date < start) return
    const daysFromStart = Math.floor((date.getTime() - start.getTime()) / 86400_000)
    const bucket = Math.min(buckets - 1, Math.floor(daysFromStart / bucketDays))
    minutesByBucket[bucket] += entry.duration
  })
  const maxM = Math.max(1, ...minutesByBucket)
  const labels = minutesByBucket.map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i * bucketDays)
    return range === 'month' ? `${d.getDate()}/${d.getMonth() + 1}` : `w${i + 1}`
  })
  return {
    heights: minutesByBucket.map(m => Math.max(8, Math.round((m / maxM) * 100))),
    labels,
  }
}

function getWeightBars(weightLog: { date: string; weightKg: number }[]) {
  if (weightLog.length < 2) return null
  const recent = weightLog.slice(-7)
  const vals = recent.map(e => e.weightKg)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  return recent.map(e => Math.max(8, Math.round(((e.weightKg - minV) / range) * 92 + 8)))
}

function WorkoutGraph({ heights, labels, label }: { heights: number[]; labels: string[]; label: string }) {
  return (
    <div className="graph-placeholder">
      <div className="graph-bars">
        {heights.map((height, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div className="graph-bar" style={{ height: `${height}%` }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{labels[i]}</span>
          </div>
        ))}
      </div>
      <p className="graph-label">{label}</p>
    </div>
  )
}

function WeightGraph({ label }: { label: string }) {
  const weightLog = getWeightLog()
  const bars = getWeightBars(weightLog)

  if (!bars) {
    return (
      <div className="graph-placeholder" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', margin: 0 }}>
          {label}
          <br />
          <span style={{ fontSize: 10 }}>הכנס משקל בדף החיטוב</span>
        </p>
      </div>
    )
  }

  const recent = weightLog.slice(-7)
  return (
    <div className="graph-placeholder">
      <div className="graph-bars">
        {bars.map((height, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div className="graph-bar" style={{ height: `${height}%`, background: '#6366f1' }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{recent[i].date.slice(5)}</span>
          </div>
        ))}
      </div>
      <p className="graph-label">{label}</p>
    </div>
  )
}

function calcLongestStreak(entries: WorkoutProgressEntry[]): number {
  const days = [...new Set(entries.map(e => e.date.slice(0, 10)))].sort()
  let best = days.length ? 1 : 0
  let cur = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diff = (curr.getTime() - prev.getTime()) / 86400_000
    if (Math.round(diff) === 1) { cur++; best = Math.max(best, cur) }
    else cur = 1
  }
  return best
}

export default function ProgressPage() {
  const { t, language } = useI18n()
  const { stats } = useUser()
  const isHebrew = language === 'he'
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'achievements'>('overview')
  const [graphRange, setGraphRange] = useState<GraphRange>('week')
  const [progressData] = useState(() => getProgressData())

  const progressEntries = [...progressData.workouts, ...progressData.cardio]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const now = new Date()
  const weekStart     = getStartOfWeek(now)
  const lastWeekStart = getStartOfLastWeek(now)
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1)

  const weeklyEntries    = progressEntries.filter(e => new Date(e.date) >= weekStart)
  const lastWeekEntries  = progressEntries.filter(e => {
    const d = new Date(e.date)
    return d >= lastWeekStart && d < weekStart
  })
  const monthlyEntries   = progressEntries.filter(e => new Date(e.date) >= monthStart)
  const totalMinutes     = progressEntries.reduce((s, e) => s + e.duration, 0)
  const monthMinutes     = monthlyEntries.reduce((s, e) => s + e.duration, 0)
  const weekMinutes      = weeklyEntries.reduce((s, e) => s + e.duration, 0)
  const lastWeekMinutes  = lastWeekEntries.reduce((s, e) => s + e.duration, 0)

  // Weekly comparison text
  const weekCompare = (() => {
    if (!weekMinutes && !lastWeekMinutes) return null
    if (!lastWeekMinutes) {
      return isHebrew
        ? `השבוע אימנת ${weekMinutes} דקות — שבוע ראשון עם נתונים 🎉`
        : `${weekMinutes} minutes this week — first recorded week 🎉`
    }
    const pct = Math.round(((weekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
    const dir = pct >= 0
      ? (isHebrew ? `${pct}% יותר` : `${pct}% more`)
      : (isHebrew ? `${Math.abs(pct)}% פחות` : `${Math.abs(pct)}% less`)
    return isHebrew
      ? `השבוע אימנת ${weekMinutes} דקות — ${dir} מהשבוע שעבר`
      : `${weekMinutes} min this week — ${dir} than last week`
  })()

  const { heights: graphHeights, labels: graphLabels } = getRangeBars(progressEntries, graphRange)

  // Monthly summary from real data
  const monthName = new Date().toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })

  // Personal Records
  const longestWorkout   = progressEntries.length ? Math.max(...progressEntries.map(e => e.duration)) : 0
  const longestRun       = progressData.cardio.length ? Math.max(0, ...progressData.cardio.map(e => e.distanceKm ?? 0)) : 0
  const longestStreak    = calcLongestStreak(progressEntries)
  // Best XP day: estimate 3 XP/min
  const xpByDay: Record<string, number> = {}
  progressEntries.forEach(e => {
    const day = e.date.slice(0, 10)
    xpByDay[day] = (xpByDay[day] ?? 0) + e.duration * 3
  })
  const bestDayXP = Object.keys(xpByDay).length ? Math.max(...Object.values(xpByDay)) : 0

  const checkinHistory = getCheckinHistory(7)

  const personalRecords = [
    { emoji: '⏱️', value: `${longestWorkout}`, unit: isHebrew ? 'דק' : 'min', label: isHebrew ? 'אימון הכי ארוך' : 'Longest workout' },
    { emoji: '⚡', value: `${bestDayXP}`, unit: 'XP', label: isHebrew ? 'הכי הרבה XP ביום' : 'Best XP day' },
    { emoji: '🔥', value: `${longestStreak}`, unit: isHebrew ? 'ימים' : 'days', label: isHebrew ? 'streak הכי ארוך' : 'Longest streak' },
    { emoji: '🏃', value: longestRun > 0 ? longestRun.toFixed(1) : '—', unit: longestRun > 0 ? 'km' : '', label: isHebrew ? 'ריצה הכי ארוכה' : 'Longest run' },
  ]

  // Achievements derived from real stats via ALL_BADGES conditions
  const achievements = ALL_BADGES.map(badge => ({
    id: badge.id,
    emoji: badge.icon,
    title: isHebrew ? badge.nameHe : badge.nameEn,
    description: isHebrew ? badge.descHe : badge.descEn,
    unlocked: badge.condition(stats),
  }))

  const progressInsight = progressEntries.length
    ? isHebrew
      ? `השבוע ${weeklyEntries.length} אימונים, החודש ${monthlyEntries.length}, סה"כ ${totalMinutes} דקות פעילות.`
      : `${weeklyEntries.length} workouts this week, ${monthlyEntries.length} this month, ${totalMinutes} total minutes.`
    : isHebrew
      ? 'עדיין אין נתונים. אחרי שתשלים אימון אחד, Ascend AI יציג כאן סיכום התקדמות.'
      : 'No data yet. Complete your first workout and Ascend AI will show your progress here.'

  const rangeLabels: Record<GraphRange, string> = isHebrew
    ? { week: 'שבוע', month: 'חודש', '3months': '3 חודשים' }
    : { week: 'Week', month: 'Month', '3months': '3 Months' }

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
          <div className="insight-tag">{isHebrew ? 'סיכום' : 'Summary'}</div>
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
            {/* Range selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'center' }}>
              {(['week', 'month', '3months'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setGraphRange(r)}
                  style={{
                    padding: '4px 14px',
                    borderRadius: 20,
                    border: 'none',
                    background: graphRange === r ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {rangeLabels[r]}
                </button>
              ))}
            </div>

            <div className="graphs-row">
              <WorkoutGraph
                heights={graphHeights}
                labels={graphLabels}
                label={isHebrew ? 'דקות אימון' : 'Workout minutes'}
              />
              <WeightGraph label={isHebrew ? 'משקל לאחרונה' : 'Weight trend'} />
            </div>

            {weekCompare && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '4px 0 12px' }}>
                {weekCompare}
              </p>
            )}

            {/* Daily Feeling History */}
            {checkinHistory.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 8 }}>
                  {isHebrew ? '😊 תחושה יומית' : '😊 Daily Mood'}
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {checkinHistory.map(c => (
                    <div
                      key={c.date}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: '6px 10px',
                        textAlign: 'center',
                        minWidth: 52,
                      }}
                    >
                      <div style={{ fontSize: 20 }}>{c.feeling}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {new Date(c.date).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Records */}
            <h3 className="section-title" style={{ marginTop: 12 }}>
              {isHebrew ? '🏆 השיאים שלי' : '🏆 Personal Records'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {personalRecords.map((pr, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26 }}>{pr.emoji}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                    {pr.value}<span style={{ fontSize: 12, marginLeft: 3, opacity: 0.7 }}>{pr.unit}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{pr.label}</div>
                </div>
              ))}
            </div>

            {/* Monthly summary — real data */}
            <div className="monthly-summary-card">
              <h3 className="section-title">{t('monthlySummary')} — {monthName}</h3>
              <div className="monthly-stats">
                <div className="monthly-stat">
                  <span>{monthlyEntries.length}</span>
                  <p>{t('workouts')}</p>
                </div>
                <div className="monthly-stat">
                  <span>{monthMinutes}</span>
                  <p>{t('minutes')}</p>
                </div>
                <div className="monthly-stat">
                  <span>{stats.xp}</span>
                  <p>{t('xpEarned')}</p>
                </div>
                <div className="monthly-stat">
                  <span>{stats.streak}</span>
                  <p>{isHebrew ? 'רצף' : 'Streak'}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'history' && (
          <div className="history-list">
            {progressEntries.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '30px 0', fontSize: 14 }}>
                {isHebrew ? 'עדיין אין אימונים מושלמים' : 'No completed workouts yet'}
              </p>
            )}
            {progressEntries.slice(0, 20).map((entry, index) => (
              <div key={`${entry.id}-${index}`} className="history-item">
                <div className="history-item-left">
                  <span className="history-date">
                    {new Date(entry.date).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                  </span>
                  <span className="history-name">{entry.type}</span>
                  <span className="history-meta">
                    {entry.duration} {isHebrew ? 'דק' : 'min'}
                    {entry.distanceKm ? ` · ${entry.distanceKm} km` : ''}
                    {entry.feeling ? ` · ${entry.feeling}` : ''}
                  </span>
                </div>
                <div className="history-item-right">
                  <span className="history-xp">
                    {entry.calories ? `${entry.calories} kcal` : '+XP'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'achievements' && (
          <div className="achievements-grid">
            {achievements.map((a, index) => (
              <div key={`${a.id}-${index}`} className={`achievement-card${a.unlocked ? ' unlocked' : ' locked'}`}>
                <span className="achievement-emoji">{a.emoji}</span>
                <span className="achievement-title">{a.title}</span>
                <span className="achievement-desc">{a.description}</span>
                {a.unlocked
                  ? <span className="achievement-date">✓</span>
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
